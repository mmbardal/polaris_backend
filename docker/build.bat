@echo off

if [%1]==[] goto usage
docker build . -f docker/release.DockerFile -t paratco/tuition:%1 --build-arg NPM_TOK=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 --progress=plain
goto :eof
:usage
@echo Usage: %0 ^<build Tag^>
exit /B 1
