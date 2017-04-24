Fixing a race condition in yesod-bin

In our work place, we
use [yesod](https://www.stackage.org/package/yesod-bin) as development
server for our web application. The `yesod` executable has two modes of operations:

* Compile mode: It shows a refreshing page indicating that the
  application is getting compiled.
* App mode: Shows the actual web application

The way it works is this:

* A http/htpps server is run concurrently on two ports.
* Stack build process is run concurrently for building the application.
* The web app is run concurrently and is reverse proxied to the
  running http/https server.

All the threads running above is synchronized properly via usage
of
[STM](https://en.wikipedia.org/wiki/Software_transactional_memory). But
there was a race condition in the code which always made the
development server in compile mode. After lot of instrumentation, I
found out that the reason behind that was this piece of code:

``` haskell
atomically (writeTVar appPortVar (-1))
```

The Stack build process was emitting out lines even after the build
was successful which again lead to overwriting of the port variable
with `-1`. This lead it to compile mode again. Pressing Return key and
re-building it again made the entire thing work but that was something
I have to guess every now and then.

## Solution

My
[initial proposed solution](https://github.com/yesodweb/yesod/issues/1380) was
to simply call the above function only when `ExitFailure` is
emitted. But unfortunately that simple solution won't work in all
cases. After lot of tinkering, I came up with an `MVar` based solution
which worked good enough:

``` haskell
data BuildOutput = Started
                   deriving (Show, Eq, Ord)

makeEmptyMVar :: MVar a -> IO ()
makeEmptyMVar mvar = do
  isEmpty <- isEmptyMVar mvar
  case isEmpty of
    True -> return ()
    False -> takeMVar mvar >> return ()

updateAppPort :: ByteString -> MVar (BuildOutput) -> TVar Int -> IO ()
updateAppPort bs mvar appPortVar = do
  isEmpty <- isEmptyMVar mvar
  let hasEnd = isInfixOf stackFailureString bs || isInfixOf stackSuccessString bs
  case (isEmpty,hasEnd) of
    (True,False) -> do
      putMVar mvar Started
      atomically $ writeTVar appPortVar (-1 :: Int)
    (_,False) -> return () 
    (_,True) -> makeEmptyMVar mvar
```

The main idea is to make the port invalid during the start of the
Stack build process and then don't do any further writing on the
`TVar` variable. When the Stack build process completes, I again make
sure that it has the ability to write to the `TVar` variable. The
ability to when to write to the `TVar` is controlled via the locking
primitive of `MVar (BuildOutput)`.

I have submitted
a [patch](https://github.com/yesodweb/yesod/pull/1381) for this
bug. Hoping to see how it goes.
