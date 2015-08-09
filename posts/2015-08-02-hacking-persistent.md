---
title: Hacking Persistent
author: Sibi
---

I'm a big fan of [persistent](https://github.com/yesodweb/persistent/)
as it offers compile time integrity checks for your database.
Whenever I need to model a new schema, I usually use this tool to come
up with the design. As I model and typecheck the code, I usually use
the `printMigration` function to see the translated SQL queries. The
code looks something like this:

```haskell
{-# LANGUAGE EmptyDataDecls             #-}
{-# LANGUAGE FlexibleContexts           #-}
{-# LANGUAGE GADTs                      #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE MultiParamTypeClasses      #-}
{-# LANGUAGE OverloadedStrings          #-}
{-# LANGUAGE QuasiQuotes                #-}
{-# LANGUAGE TemplateHaskell            #-}
{-# LANGUAGE TypeFamilies               #-}
import Control.Monad.IO.Class  (liftIO)
import Control.Monad.Logger    (runStderrLoggingT)
import Database.Persist
import Database.Persist.Postgresql
import Database.Persist.TH

share [mkPersist sqlSettings, mkMigrate "migrateAll"]
          [persistLowerCase|
Person
    name String
    age Int Maybe
    address Int
    deriving Show
BlogPost
    title String
    authorId PersonId
    deriving Show
|]

connStr = "host=localhost dbname=test user=test password=test port=5432"

main :: IO ()
main = runStderrLoggingT $ withPostgresqlPool connStr 10 $
       \pool -> liftIO $ do
                  flip runSqlPersistMPool pool $ do
                           printMigration migrateAll
```

But there is a slight problem with this code. For the program to
run successfully, It needs an actual database to be present in the
system. With that being in mind, I filed an
[issue](https://github.com/yesodweb/persistent/issues/274) hoping
it would be fixed. After around 10 months and with a little push from
[Michael Snoyman](https://github.com/yesodweb/persistent/issues/274#issuecomment-122727546),
I finally started working on the patch. As I studied the code, I sent
a [series](https://github.com/yesodweb/persistent/pull/430)
[of](https://github.com/yesodweb/persistent/pull/426)
[cleanup](https://github.com/yesodweb/persistent/pull/425)
[patches](https://github.com/yesodweb/persistent/pull/424). Finally I
figured out the problem with the actual issue and wrote a patch
for
[PostgreSQL driver](https://github.com/yesodweb/persistent/pull/436)
for it. Right now it is merged and lives in the master. So for the
above code to run properly without the actual database being present,
make use of the `mockMigration` function:

```haskell
main :: IO ()
main = mockMigration migrateAll
```

And that will print the migration for your designed database. And
today I have sent a pull request for the
[MySQL backend](https://github.com/yesodweb/persistent/pull/439). Once
it gets merged, you can also use this functionality for designing
schemas using MySQL too. And yes, this is the first time I'm doing the
development of Haskell packages using [Nix](https://nixos.org/nix/).
