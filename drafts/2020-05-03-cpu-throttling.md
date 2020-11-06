---
title: High CPU throttling of a Haskell process
author: Sibi Prabakaran
---

Recently, I have started using nixpkgs again to manage all my packages
in my base Linux distribution. And that means now my xmonad and xmobar
are both handled using the nix package manager.

Everything seemed to work fine, untill suddenly I can see that my CPU
cores getting throttled to 100%. Looking at htop, I found the culprit to
be xmobar:

Insert pic

I use around ten different monitors in the xmobar configuration:

``` haskell
commands = [ Run Weather "VOBL" ["-t..."] 36000
           , Run Cpu ["-L","3","-H","50","--normal","green","--high","red"] 10
           , Run Memory ["-t","Mem: <usedratio>%"] 10
           , Run Swap [] 10
           , Run Battery ["-t","<left>","-L","30","-H","70","--low", "red","--normal","yellow","--high","green"] 10
           , Run Date "%a %b %_d %l:%M" "date" 10
           , Run StdinReader
           , Run Wireless "wlp2s0" 
                 [ "-a", "l"
                 , "-w", "5"
                 , "-t", "<fc=#8888FF>WLAN:</fc> <essid> <quality>"
                 , "-L", "50"
                 , "-H", "75"
                 , "-l", "red"
                 , "-n", "yellow"
                 , "-h", "green"
                 ] 10
           , Run Network "eth0" ["-L","0","-H","32","--normal","green","--high","red"] 10
           , Run Network "eth1" ["-L","0","-H","32","--normal","green","--high","red"] 10
           ]
```

[Jose](https://github.com/jaor) asked me to elimnate the monitors to
small enough to find out the plugin which is causing the issue. So I
removed all my monitors except one. Each new day of my work, I used to
enable one new plugin. And in the second day itself, I found that the
issue happened only when the `StdinReader` plugin was enabled.

I also looked into the `~/.xsession-errors` file to see if I can see
the log of errors and there I found that my log was filled with this:

``` shellsession
<stdin>: hGetLine: invalid argument (invalid byte sequence)
<stdin>: hGetLine: invalid argument (invalid byte sequence)
<stdin>: hGetLine: invalid argument (invalid byte sequence)
<stdin>: hGetLine: invalid argument (invalid byte sequence)
<stdin>: hGetLine: invalid argument (invalid byte sequence)
<stdin>: hGetLine: invalid argument (invalid byte sequence)
<stdin>: hGetLine: invalid argument (invalid byte sequence)
<stdin>: hGetLine: invalid argument (invalid byte sequence)
```

Well, I have that error before a lot. That happens when the handle you
are reading from doesn't have the proper encoding associated with
it. Also, with that information - I was easy able to find the way to
trigger the bug: Just go and visit any page which has non ascii
characters in it. That will trigger the bug and will make xmobar go
into [busy waiting](https://en.wikipedia.org/wiki/Busy_waiting) mode.

This was the `StdinReader` plugin code:

``` haskell
instance Exec StdinReader where
  start stdinReader cb = do
    s <- handle (\(SomeException e) -> do hPrint stderr e; return "") getLine
    cb $ escape stdinReader s
    eof <- isEOF
    if eof
      then exitImmediately ExitSuccess
      else start stdinReader cb
```

I changed the code to print stdin's handle:

```
encoding <- hGetEncoding stdin
print encoding
```

And as expected
