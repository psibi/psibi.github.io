---
title: "A Wayland Journey: Moving from XMonad"
author: Sibi
date: 2024-05-22
---

I've been using XMonad for over a decade, but recently made the switch
to a Wayland-based compositor. This post details my experiences,
challenges, and solutions during the transition.

# The Why

It's no secret that X11 server development has [slowed
down](https://www.phoronix.com/news/XServer-2022-Development-Pace).
The Linux desktop world is steadily migrating to Wayland-based
compositors. But for me, the real push came from a post on the XMonad
team's website seeking help with Wayland support

One particular message resonated strongly: Brandon S Allbery on
[discourse.haskell.org](https://discourse.haskell.org/t/xmonad-for-wayland-call-for-help/7812/5):

<blockquote class="blockquote" style="line-height: 2rem; font-weight: bold">
Mostly that X11's days are numbered (although I expect it to last at
least until 2030 due to Red Hat's contractual obligations). But video
drivers are already starting to become less reliable as chipset
manufacturers refocus on Wayland instead of X11. This is already
affecting games and other programs which are becoming more stable under
Wayland than X11.
</blockquote>

# Transitioning to Wayland

## Choosing a Wayland Compositor

 Since I was comfortable with a tiling window manager, I needed an
 equivalent in the Wayland world.

## Software Compatibility

Here's a list of the software I use and their compatibility with
Wayland:

- Application launcher: Rofi (Luckily, a Wayland fork exists! [rofi
  fork](https://github.com/lbonn/rofi))
- Screencasting: Vokoscreen (No Wayland support yet. I opted for the
  lightweight [Kooha](https://github.com/SeaDve/Kooha) after
  VokoscreenNG's experimental Wayland support proved unreliable.)
- Browser screen sharing: This proved to be the most challenging
  aspect. While home-manager's xdg-portal [support
  helped](https://github.com/nix-community/home-manager/pull/4707), I
  encountered crashes on Google Chrome after updates. I've switched to
  Chromium, where screen sharing works fine. I considered trying
  Firefox, but it doesn't seem to allow sharing individual tabs, which
  is a feature I use in Chromium.
- Terminal multiplexer: I switched from GNU Screen (my custom
  Wayland-based clipboard fix didn't work) to Zellij, which offers
  better defaults, easy command discovery, and session opening in my
  editor. However, I miss GNU Screen's keyboard-based copying (there's
  an open [upstream
  issue](https://github.com/zellij-org/zellij/issues/947) for this in
  Zellij).
- Status bar: [cnx](https://docs.rs/cnx/latest/cnx/) (which I helped maintain) doesn't currently support
  Wayland. [i3status-rs](https://github.com/greshake/i3status-rust)
  provides a great alternative with all the widgets need.
- File manager: Thunar, according to the XFCE documentation, supports
  Wayland. However, I encountered blurred icon rendering, which was
  fixed by installing the adwaita-icon-theme package.
- Emacs: The PGTK backend works seamlessly on Wayland.
- emacs-everywhere ([my
  fork](https://github.com/psibi/emacs-everywhere)): A minor change
  was needed to make it work with Wayland (surprisingly easy!).
- Snapshots: I switched from xfce4-screenshooter to Flameshot due to
  its superior UI. However, I'm using an unreleased version to work
  around current issues in Sway (there's an [open Nixpkgs
  issue](https://github.com/NixOS/nixpkgs/issues/292700) for this).

# NixOS as My Ally

Using NixOS made the transition smoother.  The declarative
configuration management with *configuration.nix* and the home-manager
configuration file simplified the entire process.

# Living with Sway

While XMonad remains my preference for X11, Sway offers excellent
stability. I was able to easily configure it to suit my workflow.

One key difference is the lack of compilation. With XMonad, I had to
use GHC to compile Haskell code. Sway uses configuration files, which
eliminates the need for GHC and its bulky ecosystem package.  While I
appreciate this convenience, I do miss the compile-time error checking
that Haskell offers. Finding configuration issues in Sway requires
running the program.

# X11 vs. Wayland: A User's Perspective

As a non-gamer, I haven't noticed any functional differences between
X11 and Wayland.  However, based on my experience, Wayland still feels
like a maturing technology.

# Conclusion

Overall, transitioning to Wayland was a positive experience. While
there were some hurdles, the benefits of smoother performance and
future-proofing outweigh the initial challenges. This journey has also
highlighted the importance of well-maintained and user-friendly
configuration tools. If you're considering a similar switch, I hope my
experience helps you navigate the process.
