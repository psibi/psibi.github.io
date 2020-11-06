---
title: Xmobar updates from ZuriHac
author: Sibi Prabakaran
---

## Xmobar

Xmobar is a minimalistic status bar for X Window Systems. It's more
commonly used alongside with [Xmonad](https://xmonad.org/ "Xmonad") window manager.

According to Xmobar's
[documentation](https://xmobar.org/#system-monitor-plugins
"documentation"), it has around 38 monitors or plugins with it. I use
around 8 monitors in [my
configuration](https://github.com/psibi/dotfiles/blob/master/xmobar/src/Lib.hs
"my configuration"). It's very feature rich in that sense and it also
offers a very easy way to define your own custom monitor. Although I
must admit that it's documentation isn't detailed and I figured out
most parts of it by looking at the code.

## Optimizing CPU Monitor

The CPU monitor calculates your cpu load between two time intervals. I
have been wanting to optimize it for quite some time. I know that it's
not efficient by observing my htop's output with only `CPU` and
`StdinReader` monitor present in my Xmobar configuration.

I decided to tackle this problem at this year's [ZuriHac
Hackathon](https://zfoh.ch/zurihac2020/ "ZuriHac"). Since Xmobar had
no benchmarking code, my first task was to add support for
benchmarking to it. I did that as part of this
[PR](https://github.com/jaor/xmobar/pull/458 "PR").

In the above PR, I measure the `runCPU` function and this was the
initial benchmarking numbers:

``` shellsession
benchmarked Cpu Benchmarks/CPU normal args
time                 101.6 μs   (100.8 μs .. 102.3 μs)
                     0.999 R²   (0.997 R² .. 1.000 R²)
mean                 103.0 μs   (102.4 μs .. 104.5 μs)
std dev              2.883 μs   (1.465 μs .. 5.154 μs)
variance introduced by outliers: 11% (moderately inflated)
```

My next task was to add some tests for the CPU monitor since it didn't
have any (I'm sure my plan of optimizing it would likely introduce new
bugs :-)). I added five basic tests for the CPU monitor with each of
them having a slightly different template to render it's output
differently. In hindsight, it was a good decision as it caught various
issues with my implementation. Running the CPU tests is quite easy:

``` shellsession
~/g/xmobar (remove-mconfig) $ stack test --test-arguments "-m CPU"
xmobar> test (suite: XmobarTest, args: -m CPU)

Xmobar.Plugins.Monitors.Cpu
  CPU Spec
    works with total template
    works with bar template
    works with no icon pattern template
    works with icon pattern template
    works with other parameters in template

Finished in 0.0024 seconds
5 examples, 0 failures

xmobar> Test suite XmobarTest passed
```


The CPU monitor reads `/proc/stat` to find information about CPU. The
[Linux
kernel](https://www.kernel.org/doc/Documentation/filesystems/proc.txt
"Linux kernel") has a good documentation on it. We were using Lazy
Bytestring to read it. As an experimentation, I changed it to use
Strict Bytestring and measured the performance:

``` shellsession
benchmarked Cpu Benchmarks/CPU normal args
time                 107.6 μs   (107.0 μs .. 108.9 μs)
                     0.999 R²   (0.997 R² .. 1.000 R²)
mean                 107.5 μs   (107.1 μs .. 108.2 μs)
std dev              1.764 μs   (1.081 μs .. 2.669 μs)
```

Well, that's bad! I switched it back to Lazy ByteString (Although,
it's best to avoid lazy IO. I won't go into the details here as it's
discussed in much detail elsewhere in the internet.).  Then, I started
looking into the code to see if there is any other potential scope for
optimization. I came across the following code snippet:

``` haskell
cpuParser :: B.ByteString -> [Int]
cpuParser = map (read . B.unpack) . tail . B.words . head . B.lines
```

Using `read . B.unpack` is definitely not good for
performance ([More details here](https://stackoverflow.com/questions/19626392/performance-of-reading-string-to-int-in-haskell-bytestring-vs-char "More details here")). Fortunately, ByteString comes with
[readInt](https://www.stackage.org/haddock/lts-16.0/bytestring-0.10.10.0/Data-ByteString-Lazy-Char8.html#v:readInt
"readInt") function which can be used. So, I converted it to this:

``` haskell
readInt :: B.ByteString -> Int
readInt bs = case B.readInt bs of
               Nothing -> 0
               Just (i, _) -> i

cpuParser :: B.ByteString -> [Int]
cpuParser = map readInt . tail . B.words . head . B.lines
```

With that, I ran the benchmarks again and this was the result:

``` shellsession
benchmarked Cpu Benchmarks/CPU normal args
time                 89.24 μs   (88.78 μs .. 89.94 μs)
                     1.000 R²   (1.000 R² .. 1.000 R²)
mean                 89.79 μs   (89.57 μs .. 90.13 μs)
std dev              899.6 ns   (661.5 ns .. 1.333 μs)
```

That's nice. We are now 12% faster than before with such a small
change!

## Re-architecting CPU monitor and avoiding MConfig

Right now, in Xmobar we are actually having one giant data type named
`MConfig` to keep track of the configuration. It's defined as a bunch
of different `IORef`s:

``` haskell
data MConfig =
    MC { normalColor :: IORef (Maybe String)
       , low :: IORef Int
       , lowColor :: IORef (Maybe String)
       , high :: IORef Int
       , highColor :: IORef (Maybe String)
       , template :: IORef String
       , export :: IORef [String]
       , ppad :: IORef Int
       , decDigits :: IORef Int
       , minWidth :: IORef Int
       , maxWidth :: IORef Int
       , maxWidthEllipsis :: IORef String
       , padChars :: IORef String
       , padRight :: IORef Bool
       , barBack :: IORef String
       , barFore :: IORef String
       , barWidth :: IORef Int
       , useSuffix :: IORef Bool
       , naString :: IORef String
       , maxTotalWidth :: IORef Int
       , maxTotalWidthEllipsis :: IORef String
       }
```

That's a whole bunch of `IORef`. Also for the CPU monitor there seem to
be quite a lot of inefficiency going on:

* We format all the CPU data even when we only render some of them
  finally.
* The parsing stage does a lot of re-computation again and again for
  the same set of initial data.
* Template parsing is done for components which won't be rendered
  finally.

I have previously opened two related (but not same) issues on Xmobar's
issue tracker:

* [Issue 453 - Optimizing monitors](https://github.com/jaor/xmobar/issues/453 "Issue 453 - Optimizing monitors")
* [Issue 452 - Optmizing MConfig](https://github.com/jaor/xmobar/issues/452 "Issue 452 - Optmizing MConfig")

After a couple of re-writes (rewrites in Haskell are really easy!), I came
up with a design which I'm quite satisfied with. This design
introduces pure version of the `MConfig` data type we see above:

``` haskell
data PureConfig =
  PureConfig
    { pNormalColor :: (Maybe String)
    , pLow :: Int
    , pLowColor :: (Maybe String)
    , pHigh :: Int
    , pHighColor :: (Maybe String)
    , pTemplate :: String
    , pExport :: [String]
    , pPpad :: Int
    , pDecDigits :: Int
    , pMinWidth :: Int
    , pMaxWidth :: Int
    , pMaxWidthEllipsis :: String
    , pPadChars :: String
    , pPadRight :: Bool
    , pBarBack :: String
    , pBarFore :: String
    , pBarWidth :: Int
    , pUseSuffix :: Bool
    , pNaString :: String
    , pMaxTotalWidth :: Int
    , pMaxTotalWidthEllipsis :: String
    }
  deriving (Eq, Ord)
```

The above type is the same as `MConfig`, but with the `IORef`s
removed. Then I introduced non-monad transformer version of various
functions in the parsing module:

``` haskell
runExportParser :: [String] -> IO [(String, [(String, String,String)])]
runTemplateParser :: PureConfig -> IO [(String, String, String)]
pureParseTemplate :: PureConfig -> TemplateInput -> IO String
```

The idea here is that we will run the `runExportParser` and
`runTemplateParser` function to compute the data once and then use the
same data for the next invocation without doing any extra work.

I also had to write various other non-monad transformer version of the
formatters in the Output module:

``` haskell
pShowVerticalBar :: (MonadIO m) => PureConfig -> Float -> Float -> m String
pShowPercentsWithColors :: (MonadIO m) => PureConfig -> [Float] -> m [String]
pShowPercentWithColors :: (MonadIO m) => PureConfig -> Float -> m String
pShowPercentBar :: (MonadIO m) => PureConfig -> Float -> Float -> m String
pShowWithColors :: (Num a, Ord a, MonadIO m) => PureConfig -> (a -> String) -> a -> m String
pColorizeString :: (Num a, Ord a, MonadIO m) => PureConfig -> a -> String -> m String
pSetColor :: PureConfig -> String -> PSelector (Maybe String) -> String
pShowWithPadding :: PureConfig -> String -> String
pFloatToPercent :: PureConfig -> Float -> String
```

The above implementation was pretty straight forward. All I had to do
was to remove the Reader monad environment from it and instead pass
the environment explicitly. Once I had everything typechecked and the
tests pass, I ran the benchmarks again:

``` shellsession
time                 75.80 μs   (75.15 μs .. 76.36 μs)
                     1.000 R²   (0.999 R² .. 1.000 R²)
mean                 75.97 μs   (75.74 μs .. 76.41 μs)
std dev              1.057 μs   (666.6 ns .. 1.927 μs)
```

That's a 15% performance gain from the last run and total 25% perf
gain from the initial code. :-) You can see the complete code changes
for the above results [in this
PR](https://github.com/jaor/xmobar/pull/460 "PR 460").

## Future improvements

Looking into the code further, I think there is one other potential
area for optimization. I have read that `Double` is better optimized
than `Float`. Making this change probably might help us in speeding it
up. Unfortunately I didn't try that out (probably in next year's
ZuriHac ? :-))

From benchmarking various parts of the code, I found that the most CPU
intensive part is the following:

```
cpuData :: IO [Int]
cpuData = cpuParser <$> B.readFile "/proc/stat"
```

I'm not sure if that can be improved further. Probably doing [mmap
based IO](https://en.wikipedia.org/wiki/Mmap "mmap based IO") can
improve performance. But I'm not sure because `/proc` is already a
[virtual
filesystem](https://www.tldp.org/LDP/Linux-Filesystem-Hierarchy/html/proc.html
"virtual filesystem"). One of my colleagues has told me, that he will
try it out. It would be interesting to see those benchmark
results. :-)

I tried a version where I would use the same file handle and do a
[hSeek](https://www.stackage.org/haddock/lts-16.0/base/System-IO.html#v:hSeek
"hSeek") before reading it. But that resulted in a bad performance:

``` shellsession
time                 136.5 μs   (136.2 μs .. 136.7 μs)
                     1.000 R²   (1.000 R² .. 1.000 R²)
mean                 136.4 μs   (136.4 μs .. 136.6 μs)
std dev              356.2 ns   (180.7 ns .. 644.9 ns)
```

Also, I'm not sure if sharing the same file handle will result in
fresh values as the file is updated by the kernel. I'm curious to know
how a program like [Htop](https://en.wikipedia.org/wiki/Htop "Htop")
does it and see if we can apply any techniques from there.

And that summarizes my work on this year's ZuriHac!
