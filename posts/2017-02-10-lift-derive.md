---
title: Deriving Lift
---

There was a
[proposal](https://mail.haskell.org/pipermail/ghc-devs/2015-September/009838.html)
two years ago from Ryan Scott for automatic derivation of
[Lift typeclass](https://www.stackage.org/haddock/lts-7.19/template-haskell-2.11.0.0/Language-Haskell-TH-Syntax.html#t:Lift). This
has been implemented in GHC and is available from 8.0.1.

Writing QuasiQuoter has become much easier and fun now. Let's try to create [UTCTime](https://www.stackage.org/haddock/lts-6.17/time-1.5.0.1/Data-Time-Clock.html#t:UTCTime) from QuasiQuoter by parsing a string in `YYYY` format. That gives the following code:

``` haskell
{-# LANGUAGE StandaloneDeriving #-}
{-# LANGUAGE DeriveLift #-}
{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE ScopedTypeVariables #-}

import Language.Haskell.TH
import Language.Haskell.TH.Quote
import Language.Haskell.TH.Syntax
import Data.Time.Format
import Data.Time

deriving instance Lift Day

instance Lift DiffTime where
  lift x = return $ LitE (IntegerL $ diffTimeToPicoseconds x)

deriving instance Lift UTCTime

time :: QuasiQuoter
time =
  QuasiQuoter
  { quoteExp =
    \str ->
       let (item :: Maybe UTCTime) = parseTimeM 
                                     True 
                                     defaultTimeLocale 
                                     "%Y" 
                                     str
       in [|item|]
  }
```

Now load the above module in ghci:

``` shellsession
λ> :l Time.hs
[1 of 1] Compiling Main             ( Time.hs, interpreted )

λ> :set -XQuasiQuotes
λ> [time|2007|]
Just 2007-01-01 00:00:00 UTC
```

That was more easier than I thought it to be!
