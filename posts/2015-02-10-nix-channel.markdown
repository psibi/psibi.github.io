"---"
title: Nix: Managing multiple channels
author: Sibi
"---"

This post will document how to add multiple channels for the Nix
package manager and the way to install (or do any other operations)
specific software from a particular channel.

First, go to this [url](https://nixos.org/channels/) to find out the
specific channel which you want to add. Since by default nix adds the
unstable channel, I will add up the stable channel for my profile.
Note that the stable channel will be the latest nixos package version.
After finding it's url, add it like this:

`$ nix-channel --add https://nixos.org/channels/nixos-14.12`

And then update it:

`$ nix-channel --update nixos-14.12`

Now this will update and download the related nix package expressions
related to it. To see the actual downloaded path, you can do something
like this:

        sibi::monoid { ~ }-> cd ~/.nix-defexpr/        
        sibi::monoid { ~/.nix-defexpr }-> ls
        channels
        sibi::monoid { ~/.nix-defexpr }-> cd channels
        sibi::monoid { ~/.nix-defexpr/channels }-> ls
        binary-caches  manifest.nix  nixos-14.12  nixpkgs
        sibi::monoid { ~/.nix-defexpr/channels }-> cd nixos-14.12
        sibi::monoid { ~/.nix-defexpr/channels/nixos-14.12 }->
        sibi::monoid { ~/.nix-defexpr/channels/nixos-14.12 }-> ls
        default.nix  nixos  nixpkgs  programs.sqlite
        sibi::monoid { ~/.nix-defexpr/channels/nixos-14.12 }-> cd nixpkgs/
        sibi::monoid { ~/.nix-defexpr/channels/nixos-14.12/nixpkgs }->

Note that the `nixpkgs` directory above under the `channels` directory
contains expressions for the unstable channel. Now to install or
search package from that stable channel, you can do something like this:

`$ nix-env -f nixpkgs_channel_directory -iA package_name`     

which can be something like this:

`$ nix-env -f ~/.nix-defexpr/channels/nixos-14.12/nixpkgs/ -i firefox`

for installing from the stable channel.

Thanks to Lethalman from #nixos for pointing me to the right direction.
