---
title: xmonad-extras 0.13.4 released
author: Sibi
---

In the previous release of xmonad-extras-0.13.3, Giovani Silva added support for [Intel brightness control plugin](https://github.com/xmonad/xmonad-extras/pull/14). I have been using that in my [laptop](https://github.com/psibi/dotfiles/blob/11bf30521cb068a8ebef57e05b54c1d12efaede4/.xmonad/xmonad.hs) and have been happy with it.

The new xmonad-extras 0.13.4 release is basically based on my own refinements on top of it. The notable changes are:

* Previously, you need to pass cabal flag to enable the plugin. I have enabled it by default now. Also, it now supports older version of ghc till 7.10.3. I specifically had to remove the [usage of bitraverse function](https://github.com/xmonad/xmonad-extras/commit/b94db07a8e79ee11e1b05c3cd697d85786a3af8a) for it.
* Added a new convienence function named `setBrightness` in the module. I specifically use this in my Xmonad's startup hook:

``` haskell
sibiStartupHook :: X ()
sibiStartupHook = do
  as <- io getArgs
  Bright.setBrightness 1260
  ...
  ...
```

* Have improved documentation on how to use the plugin. The new documentation is accessible via the Haddock documentation in the module. Specifically, I use it with systemd to make it properly work.

Unfortunately, this version still doesn't work with the latest GHC because of an pending [upstream release](https://github.com/xmonad/xmonad-extras/issues/15).
