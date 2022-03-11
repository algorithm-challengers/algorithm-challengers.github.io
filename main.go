package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

var docsPath = filepath.Join(".", "docs")

func init() {
	if err := os.MkdirAll(docsPath, 0755); err != nil {
		panic(err)
	}
}

func main() {
	createMainPage()
}

func createMainPage() {
	f, err := os.Create(filepath.Join(docsPath, "index.html"))
	if err != nil {
		panic(err)
	}
	defer f.Close()

	f.WriteString(fmt.Sprintf(header, "Index Page"))

	sb := new(strings.Builder)
	sb.WriteString("<table>")

	titles := []string{"name", "score"}
	sb.WriteString("<thead><tr>")
	for _, title := range titles {
		sb.WriteString("<th>")
		sb.WriteString(title)
		sb.WriteString("</th>")
	}
	sb.WriteString("</tr></thead>")

	userDir := filepath.Join(".", "users")
	dirs, err := os.ReadDir(userDir)
	if err != nil {
		panic(err)
	}
	sb.WriteString("<tbody>")
	for _, dir := range dirs {
		if dir.IsDir() {
			sb.WriteString("<tr>")
			sb.WriteString("<td>")
			sb.WriteString(dir.Name())
			sb.WriteString("</td>")
			sb.WriteString("</tr>")
		}
	}
	sb.WriteString("</tbody>")
	sb.WriteString("</table>")

	f.WriteString(fmt.Sprintf(body, sb.String()))
}
