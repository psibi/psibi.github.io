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

If I try executing that code, I would get the following result block:

``` org
#+RESULTS:
: thread 'main' panicked at src/main.rs:3:5:
```

This would also open a new popup buffer with the following message:

``` shellsession
thread 'main' panicked at src/main.rs:3:5:
Hello world
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

Snapshot of my editor showing this scenario:

![](../images/posts/fixed_icon.png)

And in my opinion, this is not a good behaviour:

- The Results block is incomplete.
- Opening a new popup buffer is distracting.

And the behaviour further degrades if it's a compile error. Let's
change the above code to introduce a compile error:

``` org
#+begin_src rustic :results verbatim :exports both
  fn main() {
      panic("Hello world");
  }
#+end_src
```

All I get in my results block is this:

``` shellsession
#+RESULTS:
: error: Could not compile `cargoyacVpM`.
```

And the popup buffer actually has more details:

``` shellsession
error[E0423]: expected function, found macro `panic`
 --> src/main.rs:3:5
  |
3 |     panic("Hello world");
  |     ^^^^^ not a function
  |
help: use `!` to invoke the macro
  |
3 |     panic!("Hello world");
  |          +
help: consider importing this function instead
  |
2 + use core::panicking::panic;
  |

For more information about this error, try `rustc --explain E0423`.
error: could not compile `cargoyacVpM` (bin "cargoyacVpM") due to 1 previous error
```

I wanted to change this behaviour:
- Put all the output in Results block.
- Do not open a popup buffer.

# New behaviour

To keep the changes backward compatible, I have introduced a new
defcustom variable named *rustic-babel-display-error-popup* with a
default value of `t`. To opt into the new behaviour, you can set it to
`nil`. And if I execute the above code again, this is what I see in
the results block:

``` org
#+begin_src rustic :results verbatim :exports both
  fn main() {
      panic("Hello world");
  }
#+end_src

#+RESULTS:
#+begin_example
error[E0423]: expected function, found macro `panic`
 --> src/main.rs:3:5
  |
3 |     panic("Hello world");
  |     ^^^^^ not a function
  |
help: use `!` to invoke the macro
  |
3 |     panic!("Hello world");
  |          +
help: consider importing this function instead
  |
2 + use core::panicking::panic;
  |

For more information about this error, try `rustc --explain E0423`.
error: could not compile `cargoyacVpM` (bin "cargoyacVpM") due to 1 previous error
#+end_example
```

No more distractions! If you are curious, these were the changes done
to emacs-rustic to implement them:

- [PR 25: Ability to include compilation failure, panic as part of org result block](https://github.com/emacs-rustic/rustic/pull/25)
- [PR 27: Add compilation special case](https://github.com/emacs-rustic/rustic/pull/27)
