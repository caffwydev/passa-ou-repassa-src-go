// serial.go
package main

import (
	"bufio"
	"strings"
	"time"

	serial "go.bug.st/serial"
)

type ArduinoPairer struct {
	scanner     *ArduinoScanner
	currentPort serial.Port
	portAddress string // Novo campo para armazenar o endereço
	connected   bool
}

func NewArduinoPairer() *ArduinoPairer {
	return &ArduinoPairer{
		scanner:   NewArduinoScanner(),
		connected: false,
	}
}

func (p *ArduinoPairer) Pair() {
	for {
		ports, err := p.scanner.Scan()
		if err != nil {
			sendLog("error", "Erro na varredura: "+err.Error())
			time.Sleep(10 * time.Millisecond)
			continue
		}

		if len(ports) == 0 {
			sendLog("warning", "Nenhum Arduino encontrado")
			time.Sleep(10 * time.Millisecond)
			continue
		}

		for _, port := range ports {
			if err := p.connect(port); err != nil {
				sendLog("error", "Conexão falhou: "+err.Error())
				continue
			}
			p.monitorConnection()
		}
	}
}
func (p *ArduinoPairer) connect(portAddress string) error {
	port, err := serial.Open(portAddress, &serial.Mode{BaudRate: 115200})
	if err != nil {
		return err
	}

	p.currentPort = port
	p.portAddress = portAddress // Armazenar o endereço

	p.connected = true
	currentStatus.Online = true
	EmitAll("status", "true")

	go p.keepAlive()
	go p.readMessages()

	sendLog("success", "Dispositivo conectado: "+p.portAddress) // Usar o campo armazenado

	return nil
}

func (p *ArduinoPairer) keepAlive() {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for p.connected {
		for range ticker.C {
			if _, err := p.currentPort.Write([]byte("PI\n")); err != nil {
				p.disconnect()
				return
			}
		}
	}
}

func (p *ArduinoPairer) readMessages() {
	reader := bufio.NewReader(p.currentPort)
	for p.connected {
		message, err := reader.ReadString('\n')
		if err != nil {
			p.disconnect()
			return
		}

		msg := strings.TrimSpace(message)
		switch {
		case msg == "PO":
		case msg == "O":
		default:
			EmitAll("button", msg)
			sendLog("info", "Botão pressionado: "+msg)
		}
	}
}

func (p *ArduinoPairer) disconnect() {
	if p.connected {
		p.currentPort.Close()
		p.connected = false
		currentStatus.Online = false
		EmitAll("status", "false")
		sendLog("warning", "Conexão perdida com o dispositivo")
	}
}

func (p *ArduinoPairer) monitorConnection() {
	for p.connected {
		time.Sleep(100 * time.Millisecond)
		if !p.scanner.IsConnected(p.portAddress) {
			p.disconnect()
		}
	}
}

type ArduinoScanner struct {
	vendorIDs map[string]bool
}

func NewArduinoScanner() *ArduinoScanner {
	return &ArduinoScanner{
		vendorIDs: map[string]bool{
			"2341": true,
			"1A86": true,
			"2A03": true,
		},
	}
}

func (s *ArduinoScanner) Scan() ([]string, error) {
	ports, err := serial.GetPortsList()
	if err != nil {
		return nil, err
	}

	var validPorts []string
	for _, portName := range ports {
		port, err := serial.Open(portName, &serial.Mode{})
		if err != nil {
			continue
		}
		defer port.Close()

		vid, _ := getPortIdentifiers(portName)
		if s.vendorIDs[vid] {
			validPorts = append(validPorts, portName) // Retornar o nome/endereço da porta
		}
	}

	return validPorts, nil
}
func (s *ArduinoScanner) IsConnected(port string) bool {
	// Implementação da verificação de porta ativa
	return true
}

func getPortIdentifiers(port string) (string, string) {
	// Implementação específica do sistema operacional
	return "2341", "0043"
}
