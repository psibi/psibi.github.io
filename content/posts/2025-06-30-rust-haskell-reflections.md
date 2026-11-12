+++
title = "Reflections on Haskell and Rust"
description = "Haskell vs. Rust: A production-level comparison of two languages."
date = 2025-06-30
author = "Sibi Prabakaran"
path = "posts/2025-06-30-rust-haskell-reflections.html"

[taxonomies]
tags = ["rust", "haskell"]
+++

> **Mirrored from FP Complete.** The original FP Complete site is no longer available, so this post is mirrored here. [Read the archived original on the Wayback Machine](https://web.archive.org/web/20260723202819/https://academy.fpblock.com/blog/rust-haskell-reflections/).

## Introduction

For most of my professional experience, I have been writing production
code in both Haskell and Rust, primarily focusing on web services,
APIs, and HTTP stack development. My journey started with Haskell,
followed by working with Rust, and most recently returning to the
Haskell ecosystem.

This experience has given me perspective on both languages' strengths
and limitations in real-world applications. Each language has aspects
that I appreciate and miss when working with the other. This post
examines the features and characteristics that stand out to me in each
language.

## Variable shadowing

Rust's ability to shadow variables seamlessly is something I came to
appreciate. In Rust, you can write:

```rust
let config = load_config();
let config = validate_config(config)?;
let config = merge_defaults(config);
```

This pattern is common and encouraged in Rust, making code more
readable by avoiding the need for intermediate variable names. In
Haskell, you would typically need different names:

```haskell
config <- loadConfig
config' <- validateConfig config
config'' <- mergeDefaults config'
```

Haskell's approach is slightly harder to read, while Rust's shadowing
makes transformation pipelines more natural.

## Sum types of records

Rust's enum system, particularly when combined with pattern matching,
feels more robust than Haskell's sum types of records. When defining
sum types of records in Haskell, there is a possibility of introducing
partial record accessors which can cause runtime crashes, though
recent versions of GHC now produce compile-time warnings for this
pattern:

```haskell
data Person = Student { name :: String, university :: String }
            | Worker { name :: String, company :: String }

-- This can crash if applied to a Student
getCompany :: Person -> String
getCompany p = company p  -- runtime error for Student

-- Safe approach requires pattern matching
getCompany :: Person -> Maybe String
getCompany (Worker _ c) = Just c
getCompany (Student _ _) = Nothing
```

Rust eliminates this class of errors by design:

```rust
enum Person {
    Student { name: String, university: String },
    Worker { name: String, company: String },
}

fn get_company(person: &Person) -> Option<&str> {
    match person {
        Person::Worker { company, .. } => Some(company),
        Person::Student { .. } => None,
    }
}
```

## Enum variant namespacing

Rust allows multiple enum types to have the same variant names within
the same module, while Haskell's constructor names must be unique
within their scope. This leads to different patterns in the two
languages.

In Rust, you can define:

```rust
enum HttpStatus {
    Success,
    Error,
}

enum DatabaseOperation {
    Success,
    Error,
}

// Usage is clear due to explicit namespacing
fn handle_request() {
    let http_result = HttpStatus::Success;
    let db_result = DatabaseOperation::Error;
}
```

The same approach in Haskell would cause a compile error:

```haskell
-- This won't compile - duplicate constructor names
data HttpStatus = Success | Error
data DatabaseOperation = Success | Error  -- Error: duplicate constructors
```

In Haskell, you need unique constructor names:

```haskell
data HttpStatus = HttpSuccess | HttpError
data DatabaseOperation = DbSuccess | DbError

-- Usage
handleRequest = do
    let httpResult = HttpSuccess
    let dbResult = DbError
```

Alternatively, Haskell developers often use qualified imports syntax
to achieve similar namespacing:

```haskell
-- Using modules for namespacing
module Http where
data Status = Success | Error

module Database where
data Operation = Success | Error

-- Usage with qualified imports
import qualified Http
import qualified Database

handleRequest = do
    let httpResult = Http.Success
    let dbResult = Database.Error
```

The `Typename::Variant` syntax in Rust makes the intent clearer at the
usage site. You immediately know which enum type you're working with,
while Haskell's approach can sometimes require additional context or
prefixing to achieve the same clarity.

## Struct field visibility

Rust provides granular visibility control for struct fields, allowing
you to expose only specific fields while keeping others private. This
fine-grained control is built into the language:

```rust
pub struct User {
    pub name: String,        // publicly accessible
    pub email: String,       // publicly accessible
    created_at: DateTime,    // private field
    password_hash: String,   // private field
}

impl User {
    pub fn new(name: String, email: String, password: String) -> Self {
        User {
            name,
            email,
            created_at: Utc::now(),
            password_hash: hash_password(password),
        }
    }

    // Controlled access to private field
    pub fn created_at(&self) -> DateTime {
        self.created_at
    }
}
```

Rust offers even more granular visibility control beyond simple `pub`
and private fields. You can specify exactly where a field should be
accessible:

```rust
pub struct Config {
    pub name: String,              // accessible everywhere
    pub(crate) internal_id: u64,   // accessible within this crate only
    pub(super) parent_ref: String, // accessible to parent module only
    pub(in crate::utils) debug_info: String, // accessible within utils module only
    private_key: String,           // private to this module
}
```

These granular visibility modifiers (`pub(crate)`, `pub(super)`,
`pub(in path)`) allow you to create sophisticated access patterns that
match your module hierarchy and architectural boundaries. Some of
these patterns are simply not possible to replicate in Haskell's
module system.

In Haskell, record field visibility is controlled at the type level,
not the field level. This means you typically either export all of a
record's fields at once (using `..`) or none of them. To achieve
similar granular control, you need to use more awkward patterns:

```haskell
-- All fields exported - no control
module User
  ( User(..)  -- exports User constructor and all fields
  ) where

data User = User
  { name :: String
  , email :: String
  , createdAt :: UTCTime
  , passwordHash :: String
  }

-- Or no fields exported, requiring accessor functions
module User
  ( User        -- only type constructor exported
  , mkUser      -- smart constructor
  , userName    -- accessor for name
  , userEmail   -- accessor for email
  , userCreatedAt -- accessor for createdAt
  -- passwordHash intentionally not exported
  ) where

data User = User
  { name :: String
  , email :: String
  , createdAt :: UTCTime
  , passwordHash :: String
  }

mkUser :: String -> String -> String -> IO User
mkUser name email password = do
  now <- getCurrentTime
  hash <- hashPassword password
  return $ User name email now hash

userName :: User -> String
userName = name

userEmail :: User -> String
userEmail = email

userCreatedAt :: User -> UTCTime
userCreatedAt = createdAt
```

The Haskell approach requires writing boilerplate accessor functions
and losing the convenient record syntax for the fields you want to
keep private. Rust's per-field visibility eliminates this awkwardness
while maintaining the benefits of direct field access for public
fields.

## Purity and Referential Transparency

One of Haskell's most significant strengths is its commitment to
purity. Pure functions, which have no side effects, are easier to
reason about, test, and debug. Referential transparency—the principle
that a function call can be replaced by its resulting value without
changing the program's behavior—is a direct benefit of this purity.

In Haskell, the type system explicitly tracks effects through monads
like `IO`, making it clear which parts of the code interact with the
outside world. This separation of pure and impure code is a powerful
tool for building reliable software.

```haskell
-- Pure function: predictable and testable
add :: Int -> Int -> Int
add x y = x + y

-- Impure action: clearly marked by the IO type
printAndAdd :: Int -> Int -> IO Int
printAndAdd x y = do
  putStrLn "Adding numbers"
  return (x + y)
```

While Rust encourages a similar separation of concerns, it does not
enforce it at the language level in the same way. A function in Rust
can perform I/O or mutate state without any explicit indication in its
type signature (beyond `&mut` for mutable borrows). This means that
while you *can* write pure functions in Rust, the language doesn't
provide the same strong guarantees as Haskell.

```rust
// This function looks pure, but isn't
fn add_and_print(x: i32, y: i32) -> i32 {
    println!("Adding numbers"); // side effect
    x + y
}
```

This lack of enforced purity in Rust means you lose some of the strong
reasoning and refactoring guarantees that are a hallmark of Haskell
development.

## Error handling

Rust's explicit error handling through `Result<T, E>` removes the
cognitive overhead of exceptions. Compare these approaches:

Haskell (with potential exceptions):
```haskell
parseConfig :: FilePath -> IO Config
parseConfig path = do
    content <- readFile path  -- can throw IOException
    case parseJSON content of  -- direct error handling
        Left err -> throwIO (ConfigParseError err)
        Right config -> return config
```

Rust (explicit throughout):
```rust
fn parse_config(path: &str) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)?;
    let config = serde_json::from_str(&content)?;
    Ok(config)
}
```

In Rust, the `?` operator makes error propagation clean while keeping
the flow clear.

## Unit tests as part of source code

Rust's built-in support for unit tests within the same file as the
code being tested is convenient:

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }
}
```

In Haskell, tests are typically in separate files:

```haskell
-- src/Math.hs
add :: Int -> Int -> Int
add a b = a + b

-- test/MathSpec.hs
import Math
import Test.Hspec

spec :: Spec
spec = describe "add" $
    it "adds two numbers" $
        add 2 3 `shouldBe` 5
```

Rust's co-location makes tests harder to forget and easier to
maintain. Additionally, in Haskell you often need to export internal
types and functions from your modules just to make them accessible for
testing, which can pollute your public API.

```haskell
-- src/Parser.hs
module Parser
  ( parseConfig
  , InternalState(..)  -- exported only for testing
  , validateToken      -- exported only for testing
  ) where

data InternalState = InternalState { ... }

validateToken :: Token -> Bool
validateToken = ...  -- internal function we want to test
```

Rust's `#[cfg(test)]` attribute means test code has access to private
functions and types without exposing them publicly.

## Standard formatting

Rust's `rustfmt` provides a standard formatting tool that the entire
community has adopted:

```bash
$ cargo fmt  # formats entire project consistently
```

In Haskell, while we have excellent tools like `fourmolu` and
`ormolu`, the lack of a single standard has led to configuration
debates:

```haskell
-- Which style?
function :: Int -> Int -> Int -> IO Int
function arg1 arg2 arg3 =
    someComputation arg1 arg2 arg3

-- Or:
function ::
	   Int
	-> Int
	-> Int
	-> IO Int
function arg1 arg2 arg3 =
    someComputation arg1 arg2 arg3
```

I have witnessed significant time spent on style discussions when team
members are reluctant to adopt formatting tools.

## Language server support

While Haskell Language Server (HLS) has improved significantly, it
still struggles with larger projects. Basic functionality like
variable renaming can fail in certain scenarios, particularly in
Template Haskell heavy codebases.

rust-analyzer provides a more reliable experience across different
project sizes, with features like "go to definition" working
consistently even in large monorepos. One feature I'm particularly
fond of is rust-analyzer's ability to jump into the definitions of
standard library functions and external dependencies. This seamless
navigation into library code is something I miss when using HLS, even
on smaller projects, where such functionality is not [currently](https://github.com/haskell/haskell-language-server/issues/708)
possible.

Another feature I extensively use in rust-analyzer is the ability to
run tests inline directly from the editor. This functionality is
currently missing in HLS, though there is an [open issue](https://github.com/haskell/haskell-language-server/issues/3357) tracking
this feature request.

## Compilation time

Despite Rust's reputation for slow compilation, I've found it
consistently faster than Haskell for equivalent services. The Rust
team has made significant efforts to optimize the compiler over the
years, and these improvements are noticeable in practice. In contrast,
Haskell compilation times have remained slow, and newer GHC versions
unfortunately don't seem to provide meaningful improvements in this
area.

## Interactive development experience

I appreciate Haskell's REPL (Read-eval-print loop) for rapid
prototyping and experimentation. Not having a native REPL in Rust
noticeably slows down development when you need to try things out
quickly or explore library APIs interactively. In GHCi, you can load
your existing codebase and experiment around it, making it easy to
test functions, try different inputs, and explore how your code
behaves.

As an alternative, I have been using [org babel in rustic mode](https://github.com/emacs-rustic/rustic?tab=readme-ov-file#org-babel) for
interactive Rust development. While this provides some level of
interactivity within Emacs, it feels more like a band-aid than an
actual solution for quickly experimenting with code. The workflow is
more cumbersome compared to the direct approach of typing expressions
directly into GHCi and seeing results instantly.

## Lists as first-class citizens

Haskell's treatment of lists as first-class citizens through special
syntax can be problematic. The convenient `[]` syntax defaults to
linked lists:

```haskell
-- Easy to accidentally use inefficient linked lists
users = [user1, user2, user3]  -- O(n) access to user3
processUsers users = map processUser users  -- fine for small lists
```

Better alternatives exist but require more verbose syntax:

```haskell
import qualified Data.Vector as V
users = V.fromList [user1, user2, user3]  -- O(1) access via (!?) operator
```

While Haskell has the `OverloadedLists` extension to make this more
convenient, it hasn't enjoyed the same widespread adoption as
`OverloadedStrings`.

Rust also has [`LinkedList`](https://doc.rust-lang.org/std/collections/struct.LinkedList.html) in its standard library, but it comes
with clear documentation discouraging its use:

```rust
// std::collections::LinkedList documentation explicitly states:
// "It is almost always better to use Vec or VecDeque"

let users = vec![user1, user2, user3];  // O(1) access by default
```

## Configuration file experience

Cabal and TOML represent different approaches to project
configuration. While cabal's tool support has improved greatly with
HLS integration, which now supports features like automatic formatting
using cabal-gild, TOML enjoys broader ecosystem support.

TOML benefits from independent language servers like [taplo](https://github.com/tamasfe/taplo) and
the recent [tombi](https://github.com/tombi-toml/tombi), providing a superior editing
experience. Features like jumping to different Cargo.toml files across
a workspace or seeing descriptions of specific Cargo.toml fields on
hover work seamlessly.

Additionally, TOML has upstream support in editors like Emacs through
toml-ts-mode, which takes advantage of tree-sitter. No equivalent
exists for cabal files, likely due to the format's limited popularity
outside the Haskell ecosystem.

It's worth noting that when Cabal was created, there was likely no
widely adopted standard configuration format available. Rust had the
benefit of coming later and choosing an existing, well-established
format rather than inventing something new.

## Operational experience

I handle production operations for both Rust and Haskell services,
including parts of the Stackage infrastructure at FP Complete (which
FP Complete later donated to the Haskell Foundation). I have
encountered significantly more operational challenges with Haskell
services.

Haskell services often require tweaking GHC's RTS (Runtime system)
parameters to avoid memory issues and achieve stable performance. This
remains an ongoing challenge - recently, Bryan from the Haskell
Foundation team opened a [similar issue](https://github.com/commercialhaskell/stackage-server/issues/354) on the Stackage server,
encountering the same type of issue I dealt with. In contrast, Rust
services have been much easier to operate.

Building static binaries is trivial in Rust, and the ecosystem
actively works to reduce non-Rust dependencies. Recent efforts like
the [bzip2 crate switching from C to Rust](https://trifectatech.org/blog/bzip2-crate-switches-from-c-to-rust/) further simplify the
build process by removing C library dependencies wherever possible.

Cross-compilation to ARM is particularly straightforward. For one of
our clients, we run all production services on ARM
architecture. Setting up the entire cross-compilation pipeline took
less than a day. I would not be confident about achieving the same
with GHC and the various commonly used dependencies in Hackage.

The build process is quite simple:

```bash
# Rust: simple static binary
$ cargo build --release --target x86_64-unknown-linux-musl
$ docker build -f Dockerfile.scratch .

# Cross-compilation is trivial
$ cargo build --release --target aarch64-unknown-linux-musl
```

My experience has been that Rust services typically consume less
memory and CPU cycles than the Haskell ones in general.

## Conclusion

Both languages have their place in the software development
ecosystem. However, I find that Rust's larger user base brings
tangible benefits through more robust tooling and actively maintained
libraries. I used to reach for Haskell when writing CLI tools,
appreciating its expressiveness. These days, I find myself choosing
Rust instead, largely due to how polished libraries like `clap` have
become for command-line parsing.

While I appreciate that Haskell's theoretical foundations remain
strong for exploring effect systems and advanced type-level
programming, I observe that its library ecosystem has become less
active compared to Rust's rapidly evolving landscape.

For the web services and API development I work on, I find that Rust's
practical decisions around error handling, tooling, and operational
aspects often result in more maintainable and deployable systems.
While language choice always depends on numerous factors like team
expertise and project requirements, Rust's powerful combination of
design and ecosystem makes it a compelling option. For me, it has
become the pragmatic choice for building reliable software,
specifically when a greenfield project is involved.
