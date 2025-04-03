{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs_20
    pkgs.nodePackages.pnpm
  ];

  shellHook = ''
    echo "Web development shell loaded with Node.js and pnpm."
    pnpm install
  '';
}
