package main

import (
	"fmt"
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

	f.WriteString(fmt.Sprintf(header, "Hello, World!"))
	f.WriteString(fmt.Sprintf(body, "<h1>Hello, World!</h1>"))
}
