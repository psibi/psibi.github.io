---
title: Improving performance of fakedata
author: Sibi
---

[fakedata](https://github.com/psibi/fakedata) is a library for
producing fake data (duh!). The API for generating fake data is
simple. Let's say you have a data type named `Person`:

``` haskell
data Person =
  Person
    { personName :: Text
    , personAddress :: Text
    , personCountry :: Text
    , personEmail :: Text
    }
  deriving (Show, Eq, NFData, Generic)
```

For generating fake values for the above type, you can use this
library to create a function like this:

``` haskell
{-# LANGUAGE RecordWildCards #-}

import Data.Text (Text)
import Faker
import Faker.Address (country, fullAddress)
import Faker.Name (name)
import Faker.TvShow.SiliconValley (email)

fakePerson :: Fake Person
fakePerson = do
  personName <- name
  personAddress <- fullAddress
  personCountry <- country
  personEmail <- email
  pure $ Person {..}
```

And then you can use the `generate` function to produce fake values:

``` shellsession
λ> generate fakePerson
Person
  { personName = "Antony Langosh"
  , personAddress = "Suite 599 599 Brakus Flat, South Mason, MT 59962-6876"
  , personCountry = "Faroe Islands"
  , personEmail = "laurie@raviga.test"
  }
λ> generate $ listOf 2 fakePerson
[ Person
    { personName = "Antony Langosh"
    , personAddress = "Suite 599 599 Brakus Flat, South Mason, MT 59962-6876"
    , personCountry = "Faroe Islands"
    , personEmail = "laurie@raviga.test"
    }
, Person
    { personName = "Mason Brakus"
    , personAddress = "0347 Majorie Summit, South Majorieburgh, SD 03479"
    , personCountry = "Canada"
    , personEmail = "monica@raviga.test"
    }
]
```

There are various other
[combinators](https://www.stackage.org/haddock/nightly-2019-09-21/fakedata-0.3.0/Faker-Combinators.html)
which can be used. One of my coworker played around with it and
observed that it was too slow. This post will demonstrate the steps
involved in finding out why it is slow and operating on that data to
see if we can improve the performance. The first step to determine why
something is slow is by adding benchmarks to it. I decided to use the
[gauge library](https://tech.fpcomplete.com/haskell/library/gauge) to
perform the analysis.

I added two different benchmarks using the above function `fakePerson`
and the `email` function exposed from the module
`Faker.TvShow.SiliconValley`. The difference between both of them is
that the "Person benchmark" is comprised of four different fake fields
whereas the "Email benchmark" is a single fake field:

``` haskell
main :: IO ()
main = defaultMain benchs
  where
    benchs =
      [ bgroup
          "Email benchmark"
          [ bench "single email" $ nfIO (generate singleEmail)
          , bench "thousand emails" $ nfIO (generate thousandEmail)
          ]
      , bgroup
          "Person benchmark"
          [ bench "single person" $ nfIO (generate fakePerson)
          , bench "1000 persons" $ nfIO (generate $ listOf 1000 fakePerson)
          ]
      ]
      where
        singleEmail :: Fake Text
        singleEmail = email
        thousandEmail :: Fake [Text]
        thousandEmail = listOf 1000 email
```

Now, when I ran `stack bench` to measure it, the benchmark continued
to run after 5 minutes which clearly indicated that the performance
was bad as observed by my coworker. I reduced the generation of 1000
persons to 10 persons so that the benchmark gets completed in a
reasonable time. This was the result once it got finished:

``` shell
benchmarked Email benchmark/single email
time                 160.7 μs   (160.1 μs .. 161.4 μs)
                     1.000 R²   (0.999 R² .. 1.000 R²)
mean                 159.9 μs   (159.4 μs .. 160.6 μs)
std dev              1.951 μs   (1.444 μs .. 2.706 μs)

benchmarking Email benchmark/thousand emails ... took 9.288 s, total 56 iterations
benchmarked Email benchmark/thousand emails
time                 171.1 ms   (166.1 ms .. 174.5 ms)
                     0.999 R²   (0.998 R² .. 1.000 R²)
mean                 168.3 ms   (166.9 ms .. 169.7 ms)
std dev              2.200 ms   (1.445 ms .. 3.662 ms)

benchmarked Person benchmark/single person
time                 75.17 ms   (74.04 ms .. 76.01 ms)
                     1.000 R²   (1.000 R² .. 1.000 R²)
mean                 77.05 ms   (76.34 ms .. 78.35 ms)
std dev              1.610 ms   (794.0 μs .. 2.732 ms)

benchmarking Person benchmark/10 persons ... took 49.42 s, total 56 iterations
benchmarked Person benchmark/10 persons
time                 905.0 ms   (884.2 ms .. 921.1 ms)
                     0.999 R²   (0.998 R² .. 1.000 R²)
mean                 897.7 ms   (892.4 ms .. 904.5 ms)
std dev              10.22 ms   (7.192 ms .. 13.69 ms)
```

For generating 10 persons, it took around a second which is clearly
bad. Before trying to debug it further, let me give you a brief
overview of how the package fakedata works internally. Internally, it
uses [Ruby's faker](https://github.com/faker-ruby/faker) for it's fake
source. We have various [template haskell
functions](https://www.stackage.org/haddock/nightly-2019-09-21/fakedata-0.3.0/Faker-TH.html)
which are used extensively to generate the fake functions. Let's take
the `email` function from the `Faker.TvShow.SiliconValley` module to see how it's
implemented (Note that in the recent version of fakedata, the below
code is generated through template haskell):

``` haskell
email :: Fake Text
email = Fake (\settings -> randomVec settings siliconValleyEmailProvider)
```

The `randomVec` function will give a random value out of the `Vector`
based on the `settings` which has an appropriately seeded random
number generator. This function shouldn't be that expensive, so let's
move on to the `siliconValleyEmailProvider` function. It is implemented like
this:

``` haskell
siliconValleyEmailProvider ::
     (MonadThrow m, MonadIO m) => FakerSettings -> m (Vector Text)
siliconValleyEmailProvider settings = fetchData settings SiliconValley parseSiliconValleyEmail
```

Okay, this function seems to be calling a function named
`fetchData`. Let's see how that is implemented:

``` haskell
fetchData ::
     (MonadThrow m, MonadIO m)
  => FakerSettings
  -> SourceData
  -> (FakerSettings -> Value -> Parser a)
  -> m a
fetchData settings sdata parser = do
  let fname = guessSourceFile sdata (getLocale settings)
  afile <- getSourceFile fname
  yaml <- decodeFileThrow afile
  parseMonad (parser settings) yaml
```

So, the above function fetches the fake data source based on the
locale settings and gives out the parsed value. Now when we do
`generate (listOf 1000 email)`, it will fetch the same fake data source
1000 times. This is likely the cause of our slowdown. So, let's try to
cache it. We modify our `FakerSettings` type, to add an `IORef` where
we cache the fake source using an `HashMap`:

``` haskell
fsCacheFile :: (IORef (HM.HashMap CacheFileKey ByteString))
``` 

The `CacheFileKey` is defined like this:

``` haskell
data CacheFileKey =
  CacheFileKey
    { cfkSource :: !SourceData
    , cfkLocale :: !Text
    }
  deriving (Show, Eq, Ord, Generic, Hashable)
```

In the above code, the cache is implemented using a hashmap with the
key representing the fake data file and the value representing the
`ByteString`. Now, I further modified the `fetchData` to make sure it
first checks if the fake source is present in cache and use that if
it's available. Using this we make sure that the fake data source
isn't read more than once. After implementing the above logic, I ran
the same benchmark and this was the result:

``` shellsession
benchmarked Email benchmark/single email
time                 173.9 μs   (172.4 μs .. 175.9 μs)
                     0.999 R²   (0.999 R² .. 1.000 R²)
mean                 170.7 μs   (170.1 μs .. 171.6 μs)
std dev              2.573 μs   (2.061 μs .. 3.303 μs)

benchmarking Email benchmark/thousand emails ... took 6.991 s, total 56 iterations
benchmarked Email benchmark/thousand emails
time                 127.4 ms   (126.8 ms .. 127.9 ms)
                     1.000 R²   (1.000 R² .. 1.000 R²)
mean                 127.0 ms   (126.7 ms .. 127.2 ms)
std dev              472.1 μs   (331.2 μs .. 697.7 μs)

benchmarked Person benchmark/single person
time                 77.99 ms   (76.92 ms .. 79.74 ms)
                     0.999 R²   (0.999 R² .. 1.000 R²)
mean                 74.97 ms   (73.67 ms .. 76.18 ms)
std dev              2.299 ms   (1.859 ms .. 2.717 ms)

benchmarking Person benchmark/10 persons ... took 48.28 s, total 56 iterations
benchmarked Person benchmark/10 persons
time                 878.0 ms   (861.7 ms .. 913.2 ms)
                     0.998 R²   (0.996 R² .. 1.000 R²)
mean                 877.1 ms   (870.4 ms .. 887.8 ms)
std dev              15.08 ms   (9.567 ms .. 23.57 ms)
```

Comparing it with the previous results, we can observe that when
generating 1000 emails and 10 persons that has been marginal
performance improvement of around 3%. But there has been slight
performance decrease when generating a single email and person. That can
be attributed to the increased overhead of maintaining and checking
the cache. Overall, this didn't turn out to be a big performance
improvement. So, it seems reading the file again and again wasn't a
big bottleneck after all!

Note that in the above step, we have internally cached `ByteString` to
avoid re-reading files. But we still parse `ByteString` to [yaml's
AST](https://www.stackage.org/haddock/nightly-2019-08-31/yaml-0.11.1.2/Data-Yaml.html#t:Value)
each time. But we can avoid this by directly caching the parsed yaml
value instead of `ByteString`. So our `fsCacheFile` field becomes like
this:

```
fsCacheFile :: (IORef (HM.HashMap CacheFileKey Value))
```

Let's do the required changes in `fetchData` to make it typecheck and
run the benchmarks again:

``` shellsession
benchmarked Email benchmark/single email
time                 166.0 μs   (165.7 μs .. 166.3 μs)
                     1.000 R²   (1.000 R² .. 1.000 R²)
mean                 164.4 μs   (164.1 μs .. 164.7 μs)
std dev              1.134 μs   (950.7 ns .. 1.449 μs)

benchmarked Email benchmark/thousand emails
time                 1.345 ms   (1.342 ms .. 1.347 ms)
                     1.000 R²   (1.000 R² .. 1.000 R²)
mean                 1.337 ms   (1.335 ms .. 1.339 ms)
std dev              6.066 μs   (5.098 μs .. 7.473 μs)

benchmarked Person benchmark/single person
time                 13.13 ms   (12.73 ms .. 13.56 ms)
                     0.997 R²   (0.995 R² .. 1.000 R²)
mean                 12.75 ms   (12.69 ms .. 12.89 ms)
std dev              235.8 μs   (70.84 μs .. 386.1 μs)

benchmarked Person benchmark/10 persons
time                 24.07 ms   (23.76 ms .. 24.45 ms)
                     0.999 R²   (0.998 R² .. 1.000 R²)
mean                 24.61 ms   (24.46 ms .. 24.78 ms)
std dev              371.9 μs   (270.4 μs .. 507.5 μs)
```

Now this has improved things drastically. For generating thousand
emails, the time taken has improved by 97% and the code now takes around
2.6% of the original time it was taking. So, it seems the real
bottleneck was parsing the values again and again! Our optimization
above makes sure that we don't read and parse the file more than once.

Now, we can optimize this further by additional caching of individual
fields with the yaml so that we don't have to traverse the entire AST
again if we have already accessed it once. Let's add one more caching
field in `FakerSettigns`:

``` haskell
fsCacheField :: (IORef (HM.HashMap CacheFieldKey (Vector Text)))
```

Now we need to modify the `randomVec` function to check for the field
and use that if it's present. Implementing the above logic gave a
slight performance boost:

``` shellsession
benchmarked Email benchmark/single email
time                 170.3 μs   (169.4 μs .. 171.4 μs)
                     1.000 R²   (0.999 R² .. 1.000 R²)
mean                 169.3 μs   (168.6 μs .. 170.1 μs)
std dev              2.401 μs   (1.870 μs .. 3.800 μs)

benchmarked Email benchmark/thousand emails
time                 456.3 μs   (449.6 μs .. 468.0 μs)
                     0.998 R²   (0.995 R² .. 1.000 R²)
mean                 457.2 μs   (455.3 μs .. 460.6 μs)
std dev              8.188 μs   (5.352 μs .. 14.22 μs)

benchmarked Person benchmark/single person
time                 13.59 ms   (13.05 ms .. 13.98 ms)
                     0.997 R²   (0.995 R² .. 1.000 R²)
mean                 13.30 ms   (13.20 ms .. 13.44 ms)
std dev              293.2 μs   (207.5 μs .. 379.5 μs)

benchmarked Person benchmark/10 persons
time                 22.28 ms   (21.78 ms .. 22.86 ms)
                     0.996 R²   (0.988 R² .. 0.999 R²)
mean                 23.23 ms   (22.98 ms .. 23.62 ms)
std dev              734.1 μs   (464.7 μs .. 1.190 ms)
```

All these fixes have made into fakedata-0.3.0. One another potential
improvement which we can make is using the random number generator
from the [splitmix](https://github.com/phadej/splitmix) package
instead of using `StdGen` present in the `random` package. According
to the benchmark reported by the package, it seems to be around 96%
faster than the random package. But when I tried to port it, I was hit
[with this bug](https://github.com/phadej/splitmix/issues/23) which
stopped me from further experimenting it. And that was our entire
workflow for improving the performance of the library.
