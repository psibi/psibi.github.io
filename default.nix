{ nixpkgs ? import <nixpkgs> {}, compiler ? "ghc7101" }:
let
  inherit (nixpkgs) pkgs;
  ghc = pkgs.haskell.packages.${compiler}.ghcWithPackages (ps: with ps; [
        hakyll
                    ]); 
in pkgs.stdenv.mkDerivation {
  name = "sibi-blog";
  version = "1.0.0";
  src = ./.;
  buildInputs = [
    ghc
  ];
  shellHook = "eval $(egrep ^export ${ghc}/bin/ghc)";
}
