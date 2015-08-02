---
title: Understanding unsafeInterleaveIO
author: Sibi
---

While answering some
[question](http://stackoverflow.com/q/31342002/1651941) in
StackOverflow, I came across this following piece of code which won't
terminate:

```haskell
import System.Random

g :: IO [Integer]
g = do
  n <- randomRIO (1,6) :: IO Integer
  f <- g
  return (n : f)
```

So, now we can see why this piece of computation doesn't terminate.
The line `f <- g` specifically makes it go on and on. Now can we make
it work using `unsafeInterleaveIO`:

```haskell
import System.Random
import System.IO.Unsafe (unsafeInterleaveIO)

g :: IO [Integer]
g = do
  n <- randomRIO (1,6) :: IO Integer
  f <- unsafeInterleaveIO g
  return (n : f)
```

In a sample GHCI session:

```
λ> g >>= \x -> return $ take 5 $ x
[1,2,2,5,6]
```

With a Bang!, we can again make it non-terminating:

```haskell
{-#LANGUAGE BangPatterns#-}

import System.Random
import System.IO.Unsafe (unsafeInterleaveIO)

g :: IO [Integer]
g = do
  n <- randomRIO (1,6) :: IO Integer
  !f <- unsafeInterleaveIO g
  return (n : f)
```

And in GHCI:

```
λ> g >>= \x -> return $ take 5 $ x
  C-c C-c Interrupted.
```

Note that I still believe it's a bad option to use
`unsafeInterleaveIO` unless there is no other go. But I find this
example as a nice way to understand the working of `unsafeInterleaveIO`.
