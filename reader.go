// reader.go
package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Question struct {
	Text    string   `json:"text"`
	Options []string `json:"options"`
	Answer  string   `json:"answer"`
}

type Questionary struct {
	ID        int        `json:"id"`
	Title     string     `json:"title"`
	Questions []Question `json:"questions"`
}

func readQuestionaries() (map[string]Questionary, error) {
	questionaries := make(map[string]Questionary)

	files, err := os.ReadDir("upload")
	if err != nil {
		return nil, err
	}

	for idx, file := range files {
		if filepath.Ext(file.Name()) != ".qn" {
			continue
		}

		path := filepath.Join("upload", file.Name())
		q, err := parseQuestionFile(path)
		if err != nil {
			sendLog("error", "Erro ao ler arquivo "+file.Name()+": "+err.Error())
			continue
		}

		q.ID = idx + 1
		questionaries[q.Title] = *q
	}

	return questionaries, nil
}

func parseQuestionFile(path string) (*Questionary, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	q := &Questionary{}
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "#") {
			q.Title = strings.TrimSpace(line[1:])
		} else {
			question, err := parseQuestionLine(line)
			if err == nil {
				q.Questions = append(q.Questions, *question)
			}
		}
	}

	if len(q.Questions) == 0 {
		return nil, fmt.Errorf("arquivo sem questões válidas")
	}

	return q, nil
}

func parseQuestionLine(line string) (*Question, error) {
	parts := strings.Split(line, "%")
	if len(parts) != 5 {
		return nil, fmt.Errorf("formato inválido")
	}

	question := &Question{
		Text:    strings.TrimSpace(parts[0]),
		Options: make([]string, 4),
	}

	var correctAnswer string
	for i, part := range parts[1:] {
		option := strings.TrimSpace(part)
		if strings.HasPrefix(option, "*") {
			option = option[1:]
			correctAnswer = option
		}
		question.Options[i] = option
	}

	if correctAnswer == "" {
		return nil, fmt.Errorf("nenhuma resposta correta especificada")
	}

	question.Answer = correctAnswer
	return question, nil
}
