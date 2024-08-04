---
title: New Org Babel features for Rustic
author: Sibi
date: 2024-08-04
---

[Rustic](https://github.com/emacs-rustic/rustic) is an emacs major mode for Rust. It is built on top of
[rust-mode](https://github.com/rust-lang/rust-mode).

Rustic has Org Babel integration which allows you to embed your Rust
code as part of your buffer and execute code directly from the editor.

This makes it quite useful for literate programming, interactive
development and for scripting which I use at my work.

This is the basic workflow:

- Open a new org file
- Put your source code under source block

``` org
#+begin_src rustic :results verbatim :exports both
  fn main() {
      println!("Hello world");
  }
#+end_src
```

- And then execute it by pressing `Ctrl-C Ctrl-c`.

For the above source block, it would produce the following result
block below the source block:

``` org
#+RESULTS:
: Hello world
```

You can keep editing the source block and executing it by presing
`Ctrl-C Ctrl-C` and your result block would keep updating.

# On Panics and errors

The above workflow is nice until you hit a panic in your running code
or a compilation error.

Let's introduce a panic in the above code:

``` org
#+begin_src rustic :results verbatim :exports both
  fn main() {
      panic!("Hello world");
  }
#+end_src
```
