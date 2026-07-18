{
  description = "memora — Servidor MCP experimental para indexación semántica de código con grafos de conocimiento";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: {
        default = pkgs.stdenv.mkDerivation {
          pname = "memora";
          version = "0.6.0";

          src = ./.;

          nativeBuildInputs = [ pkgs.gnumake ];
          buildInputs = [ pkgs.zlib ];

          # scripts/build.sh verifies the compiler via `file`, which fails on Nix
          # because CC is a bash wrapper script rather than a binary. Call make
          # directly to bypass that check; the Nix stdenv already guarantees the
          # correct compiler and target architecture.
          buildPhase = ''
            make -j$NIX_BUILD_CORES -f Makefile.cbm cbm
          '';

          installPhase = ''
            install -Dm755 build/c/codebase-memory-mcp $out/bin/memora
          '';

          meta = {
            description = "Servidor MCP experimental para indexación semántica de código con grafos de conocimiento";
            homepage = "https://github.com/TakaraDasein/memora";
            license = nixpkgs.lib.licenses.mit;
            mainProgram = "memora";
            platforms = systems;
          };
        };
      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          inputsFrom = [ self.packages.${pkgs.system}.default ];
        };
      });
    };
}
