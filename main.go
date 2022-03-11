package main

import (
	"os"
	"path/filepath"
)

var docsPath = filepath.Join(".", "docs")

func init() {
	if err := os.MkdirAll(docsPath, 0755); err != nil {
		panic(err)
	}
}

func main() {
	f, err := os.Create(filepath.Join(docsPath, "index.html"))
	if err != nil {
		panic(err)
	}
	defer f.Close()

	f.WriteString(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Go Docs</title>
</head>
<body>
	<h1>Go Docs</h1>
</body>`)
}
