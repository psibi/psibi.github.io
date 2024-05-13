---
title: New Home for Rustic
author: Sibi
date: 2024-05-13
---

[Rustic](https://github.com/emacs-rustic/rustic) is an Emacs major mode built on top of
[rust-mode](https://github.com/rust-lang/rust-mode). I use it daily
for all my Rust development work.

## Current situation

Rustic was developed by [@brotzeit](https://github.com/brotzeit), and I
have been helping out the project by fixing [bugs and adding
features](https://github.com/brotzeit/rustic/commits?author=psibi) to it.

I was granted access to review others' pull requests (PRs)
and merge them. I occasionally review PRs for the project. Currently,
I have a [bunch of
PRs](https://github.com/brotzeit/rustic/pulls/psibi) that I authored
and are pending review.

Unfortunately, I haven't been able to reach @brotzeit for some time
now. I hope he's doing well. In September of last year, I sent him an
email regarding commit access to the Rustic repository, but haven't
heard back.

Given the current situation, I have been maintaining my own fork of
rustic for the last six months now.

[Troy Hinckley](https://github.com/CeleritasCelery) reached out to me
couple of days ago to ask [if my fork of Rustic could become the
maintained](https://github.com/psibi/rustic/issues/23) fork. He is also
willing to help lighten the load. So even though I was initially hesistant,
I would now like to go ahead and make it more official.

## Current Status of rustic mode

My fork of Rustic mode has accumulated several changes. Here are the
most important ones:

- Added support for enabling tree sitter integration with `rust-mode`.
- Revamped the testing infrastructure to use Cask only.
- Fixed various test failures for newer Rust and Emacs
  releases. Pinned the Rust version in CI for easier development and
  root cause analysis.
- Populated minibuffer entries for `rustic-cargo-clippy`,
  `rustic-cargo-build`, and `rustic-cargo-test` when invoked with a
  universal argument.
- Fixed integration with `lsp-mode` for buffer formatting.
- Minor cleanups: Removed Racer dependency, replaced Makefile, etc.

## Future

I plan to continue maintaining Rustic mode. My main focus will be on
ensuring smooth integration with Rust language analyzer and
tree-sitter utilities.
