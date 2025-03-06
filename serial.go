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
	portAddress string
	connected   bool
}

var lastPing = time.Now()

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
			lastPing = time.Now()
		case msg == "O":
			lastPing = time.Now()
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
		if time.Since(lastPing) > time.Second*5 {
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
			"2341": true, // Arduino LLC (Arduino Uno, Mega, Nano, etc.)
			"1a86": true, // CH340 (clones de Arduino e STM32)
			"0403": true, // FTDI (FT232, FT231X - usado em muitos adaptadores)
			"10c4": true, // CP210x (Silicon Labs - usado em ESP32, ESP8266)
			"2e8a": true, // Raspberry Pi (Pico - RP2040)
			"16c0": true, // Teensy (PJRC)
			"1b4f": true, // SparkFun (Pro Micro)
			"239a": true, // Adafruit (Feather)
			"0483": true, // STMicroelectronics (STM32 - Blue Pill, Black Pill)
			"03eb": true, // Atmel (AVR - microcontroladores antigos)
			"04d8": true, // Microchip (PIC - alguns modelos com USB)
			"04b4": true, // Cypress (FX2 - usado em alguns programadores)
			"1366": true, // SEGGER (J-Link - programadores/debuggers)
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

		vid := getPortIdentifiers(portName)
		if s.vendorIDs[vid] {
			validPorts = append(validPorts, portName)
		}
	}

	return validPorts, nil
}

func getPortIdentifiers(port string) string {
	portVendor, err := GetVendorID(port)
	if err != nil {
		return ""
	}
	finalVendor := VendorIDToString(portVendor)

	return finalVendor
}
