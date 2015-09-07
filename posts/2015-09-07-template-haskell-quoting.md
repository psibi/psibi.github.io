---
title: Quoting functions in Template Haskell
author: Sibi
---

While working on
[this patch](https://github.com/yesodweb/shakespeare/pull/165/files),
I learned a cool feature of Template Haskell called quoting function.
Instead of using `VarE (mkName "show")` to create an `Exp` type, you
can safely create the same using this: `VarE 'Prelude.show`. When
generating declartions using splicing, the import of the module will
be taken care of by itself. A self contained example:

```haskell
{-#LANGUAGE TemplateHaskell#-}
-- External.hs
module External where

import Data.Time
import Language.Haskell.TH

example :: Name
example = 'getCurrentTime

sampleDec :: Q [Dec]
sampleDec = return $
[ValD (VarP (mkName "hello")) (NormalB (VarE example)) []]
```

And the other module:

```haskell
{-#LANGUAGE TemplateHaskell#-}
-- Other.hs
import External

$(sampleDec)

main = do
  x <- hello
  print x
```

Now you can see this in `ghci`:

```haskell
λ> main
2015-09-01 22:01:34.532374 UTC
```

See how I didn't have to import `Data.Time` in the `Other.hs` file.
The single quote can be also used for data constructors. Similarly, a
type can be converted to `Name` using double quote.
