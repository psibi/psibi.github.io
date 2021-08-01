with import <nixpkgs> { };
stdenv.mkDerivation {
  name = "psibi";
  buildInputs = [
    haskell.compiler.ghc884
    zlib
  ];
}
