---
title: Diwali hacks
author: Sibi
---

After quite a long time, I got some spare hours to hack on open source
projects during this Diwali holidays. I added a helper function in
[persistent](https://github.com/yesodweb/persistent/pull/509) which in
my opinion is super cool:

The `liftSqlPersistMPool` is simply defined like this:

```haskell
liftSqlPersistMPool :: MonadIO m => SqlPersistM a -> Pool SqlBackend -> m a
liftSqlPersistMPool x pool = liftIO (runSqlPersistMPool x pool)
```

And this will help in converting code like this:

```haskell
main :: IO ()
main = runStderrLoggingT $ withPostgresqlPool conn 10 $ \pool -> liftIO $ do
         flip runSqlPersistMPool pool $ do
           runMigration migrateAll
```

to:

```haskell
main :: IO ()
in = runStderrLoggingT $ withPostgresqlPool conn 10 $ liftSqlPersistMPool $ do
         runMigration migrateAll
```

Ain't that neat? :-)

The other patches for persistent included
[some cleanup](https://github.com/yesodweb/persistent/pull/505),
[some documentation](https://github.com/yesodweb/persistent/pull/504)
and a
[ownership related patch](https://github.com/yesodweb/persistent/pull/501).
Although, I plan to work on the ownership related code later. (See
[Issue 390](https://github.com/yesodweb/persistent/issues/390) for
more details.)

Also, I briefly hacked on the emacs haskell-mode package. Sent some
minor patch related to
[hayoo](https://github.com/haskell/haskell-mode/pull/984) and
[cleanup](https://github.com/haskell/haskell-mode/pull/987).

With respect to mathematics, I was not able to progress much besides
reading some pages in Chapter 5. But I'm almost at the [end of the
chapter 5](https://github.com/psibi/how-to-prove/tree/master/chapter%205).
