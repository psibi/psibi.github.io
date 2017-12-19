---
title: Viewing Stack snapshots
author: Sibi
---

Just some days ago, I [got my pull request for `ls` subcommand](https://github.com/commercialhaskell/stack/pull/3252) feature
accepted into Stack. Due to my laziness and unclear design issues
(mostly the former), it took around five months for me to make it
upstream. So, this is the interface of the new feature:

``` shellsession
~ $ stack ls --help
Usage: stack ls COMMAND [--help]
  List command. (Supports snapshots)

Available options:
  --help                   Show this help text

Available commands:
  snapshots                View local snapshot (default option)

Run 'stack --help' for global options that apply to all subcommands.
~ $ stack ls snapshots --help
Usage: stack ls snapshots [COMMAND] [-l|--lts] [-n|--nightly]
  View local snapshot (default option)

Available options:
  -l,--lts                 Only show lts snapshots
  -n,--nightly             Only show nightly snapshots
  -h,--help                Show this help text

Available commands:
  remote                   View remote snapshot
  local                    View local snapshot
```

Using this feature, I can easily query my system or the Stackage
servers to see what resolvers are available. This will be availble in
the next release of Stack but if you want to give it a go now, you can
do `stack upgrade --git`.

## Origin

So, why did I create this ? I have always wanted this feature when writing scripts using [Stack interpreter](https://docs.haskellstack.org/en/stable/GUIDE/#script-interpreter). Pin-pointing to an existing local resolver ensured that I need not download and build the packages again (and saving quite a bit of time). And doing that manually was messy. That's when I went into the source and implemented the feature. Now, all I have to do is this:

``` shellsession
~ $ stack ls snapshots -n
nightly-2016-11-06
nightly-2016-12-31
nightly-2017-01-12
nightly-2017-03-20
nightly-2017-07-25
nightly-2017-07-31
nightly-2017-08-15
nightly-2017-09-07
```

Then, I also wanted a way to see the latest released lts resolvers in Stackage. And that's why I added the `remote` command support for it. I specifically had to [patch Stackage servers](https://github.com/fpco/stackage-server/pull/230) to get this functionality working.

## Future work

The future work is to get the [user guide documentation](https://github.com/commercialhaskell/stack/pull/3672) updated describing the functionality. I also have volunteered to bring the `list-dependencies` sub command under this new interface. [Issue 3669](https://github.com/commercialhaskell/stack/issues/3669) has been made to track this.



