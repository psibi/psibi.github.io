---
title: Rucredstash release & Rust experience from an Haskeller
author: Sibi
---

## Credstash

Credstash is a cli utility for managing credentials securely in AWS
cloud. It uses a combination of AWS Key Management Service (KMS) and
DynamoDB to achieve it. One of my co-worker has written a more
[detailed tutorial](https://www.fpcomplete.com/blog/2017/08/credstash)
here. The original tool was written by a company named
[Fugue](https://github.com/fugue/credstash) in Python. It has been
implemented in various languages including Rust which I have authored.

## New release v0.8.0

I recently released a new version of
[credstash](https://github.com/psibi/rucredstash/releases/tag/v0.8.0)
and with that, *rucredstash* cli executable becomes a drop in
replacement to the original credstash program. While you could use it
previously too, it lacked the *putall* subcommand. This subcommand had
three different ways of passing data to it:

### Passing data via file

You can pass the input from a file using the special symbol `@` to
indicate that the data is fed from the file:

``` shellsession
$ bat secrets.json
───────┬────────────────────────────────────────
       │ File: secrets.json
───────┼────────────────────────────────────────
   1   │ {
   2   │     "hello": "world",
   3   │     "hi": "bye"
   4   │ }
───────┴────────────────────────────────────────
$ rucredstash putall @secrets.json
hello has been stored
hi has been stored
```

### Passing data via stdin

You can also pass the data via stdin using the special operator `-`:

``` shellsession
$ rucredstash putall -
{ "hello": "world" }
hello has been stored
```

You press the [Enter key](https://en.wikipedia.org/wiki/Enter_key
"Enter key") to indicate that you have finished passing the data.

### Passing data directly

``` shellsession
$ rucredstash putall '{"hello":"world","hi":"bye"}'
hello has been stored
hi has been stored
```

I disliked the above overloaded behavior and wanted to give a
~~different~~ better user experience in my Rust implementation. But
that meant breaking compatibility with the original program. So, I
finally bit the bullet and implemented it. With that, it becomes a
drop in replacement to the original Python program which was my
primary goal when I started working on rucredstash.

## Future improvements

With v0.8.0 of rucredstash released, I still think there are lots of
improvements which can be done. Some of them are:

* Integrate [clippy](https://github.com/rust-lang/rust-clippy) in the
  CI.
* While the [library
  module](https://github.com/psibi/rucredstash/blob/c315f1428dfd02b143eb9404fe08b9f37d41ccf7/src/lib.rs#L1)
  is completely panic free, I think the [CLI
  driver](https://github.com/psibi/rucredstash/blob/master/src/main.rs)
  still has scope of improvements. There are several places where I'm
  using
  [expect](https://doc.rust-lang.org/std/option/enum.Option.html#method.expect)
  method which needs to be fixed. It shouldn't be hard IMO. :-)
* Add a new subcommand for `setup`. Something along the line of `setup
  cmk` probably which should setup the [Customer master
  key](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#master_keys). Note
  that this functionality isn't present in the original credstash
  program.
* Experiment with structopt crate and see how it goes!

I should create a github issues of all the above points!

## Comparing Rust with Haskell

Now that I have *some* experience with Rust and have been working on
it minorly for a year or so, I would like to compare it with my other
favorite language: Haskell. My primary language at work and hobby is
Haskell and I initially didn't really see what value Rust would
add. But I'm happy that I made the investment to learn it and this
section will try to compare Rust with Haskell in terms of library
quality, community, documentation etc. Note that my experience is
based on writing and maintaining *rucredstash*. Also, my codebase
isn't that big so probably my view would change based on more
experience:

``` shellsession
$ cloc src tests/
       5 text files.
       5 unique files.
       0 files ignored.

github.com/AlDanial/cloc v 1.74  T=0.01 s (382.4 files/s, 170528.1 lines/s)
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
Rust                             4            149            123           1918
Bourne Shell                     1             13              0             27
-------------------------------------------------------------------------------
SUM:                             5            162            123           1945
-------------------------------------------------------------------------------
```

So it's roughly around 2000 Rust source lines. My initial code was
based on futures as the [rusoto
crate](https://crates.io/crates/rusoto) which I use to interact with
the AWS API didn't support async/await yet. And that was pretty
ugly. But once the crate supported async/await, the migration was
smooth and the new code was much simpler.

I find the Rust community to be quite active and responsive. It was
easy for me to
[contribute](https://github.com/rusoto/rusoto/pull/1649/files) to
it. Also one of the stark difference between Rust and the Haskell
community is the way they approach the problem. In Haskell, it's
discouraged to use the [Default
typeclass](https://www.reddit.com/r/haskell/comments/5gospp/dont_use_typeclasses_to_define_default_values/)
to define default values. As compared to this, Rust provides a
[Default
trait](https://doc.rust-lang.org/std/default/trait.Default.html) in
the standard library itself. Infact, Rust's [lint
checker](https://github.com/rust-lang/rust-clippy) suggested me to use
that in one of the places!

Now I'm going to compare Rust and Haskell's library for the same
task. Let me pick two equivalent libraries from both the languages:

| Task    | Haskell library                                                            | Rust Library                            |
|---------|----------------------------------------------------------------------------|-----------------------------------------|
| CLI     | [optparse-applicative](https://github.com/pcapriotti/optparse-applicative) | [clap](https://github.com/clap-rs/clap) |
| AWS API | [amazonka](https://github.com/brendanhay/amazonka)                         | [rusoto](https://github.com/rusoto/rusoto/pull/1649/files)                                        |

Compared to Haskell's optparse-applicative, my experience with clap
was that I had to write a lots of boilerplate code to parse the value
from
[ArgMatches](https://docs.rs/clap/2.33.3/clap/struct.ArgMatches.html). One
of my co-worker mentioned to me that I should use
[structopt](https://github.com/TeXitoi/structopt) for that. Also,
there are various method in the clap crate like
[conflicts_with](https://docs.rs/clap/2.33.3/clap/struct.Arg.html#method.conflicts_with),
[requires](https://docs.rs/clap/2.33.3/clap/struct.Arg.html#method.requires)
and the related method which is quite nice. In my experience,
expressing that kind of relationship using optparse-applicative is
quite hard and the reason I guess is technical (optparse-applicative
relying on Applicative).

I think comparing amazonka with rusoto is unfair. Mostly because
amazonka is
[unmaintained](https://github.com/brendanhay/amazonka/issues/574). But
the reason for comparing them is to point out that Rust community
usually seems to be much more active and it's libraries are much well
maintained. Also, building amazonka package takes huge amount of
memory. In fact,
[amazonka-ec2](https://github.com/brendanhay/amazonka/issues/549)
needs around 7GB of memory. I dread every time a CI run tries to build
an amazonka package without the cache. Let me use the
optparse-applicative example to drive the same message that Rust
community seems to be more active. An [issue was opened on
2014](https://github.com/pcapriotti/optparse-applicative/issues/118)
in the optparse-applicative repository regarding supporting options
via environment variables. A similar [issue was opened on
2017](https://github.com/clap-rs/clap/issues/814) in clap and a [PR
for that](https://github.com/clap-rs/clap/pull/1062) was merged on the
same year. But compared to this, there is no such feature yet
implemented for optparse-applicative.

Also, the documentation of Rust libraries in general is top
notch. Although there has been recent efforts in the Haskell community
to improve the base docs, the Rust standard library is way ahead. Also
the [Rust book](https://doc.rust-lang.org/book/) is really nice and
makes it easy to learn the language itself. Also, the platform itself
encourages writing more documentation by displaying it's statistics in
the page:

todo: insert pic

That being said, I should note that Rust and Haskell are different
languages with different trade offs. It would be even unfair to
compare them on a purely language basis. (Although I feel this [blog
post](https://www.fpcomplete.com/blog/2018/11/haskell-and-rust/) does
a nice job of comparing them!). One part of the language which I I'm
starting to prefer is Rust's error handling. It's much easier to
understand than Haskell's exception mechanism. Doing safe [exception
handling](https://www.fpcomplete.com/haskell/tutorial/exceptions/) in
Haskell isn't easy and with the presence of async exceptions things
get more complicated. You don't have to deal with such issues in Rust
as errors are modelled via enum type and you can use the `?` operator
to easily propagate it. Also this will likely make the FFI integration
story much easier. That kind of summarizes my experience with Rust as
a Haskell programmer. I'm planning to reach out more to Rust in future
for various things for which I would have previously used Haskell.
