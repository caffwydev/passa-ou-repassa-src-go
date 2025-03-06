// main.go
package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"math/rand/v2"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zishang520/engine.io/v2/types"
	"github.com/zishang520/socket.io/v2/socket"
)

//go:embed public/*
var publicFS embed.FS

type LogMessage struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	Time    string `json:"time"`
}

type DeviceStatus struct {
	Online bool `json:"online"`
}

var isOnline = false
var (
	httpserver    *types.HttpServer
	server        *socket.Server
	currentStatus = &DeviceStatus{Online: false}
	logChannel    = make(chan LogMessage, 100)
)

func main() {
	// Configuração inicial
	setupUploadDir()
	subFS := setupFilesystem()

	// Configurar servidor HTTP
	router := gin.Default()

	// Configurar Socket.IO

	c := socket.DefaultServerOptions()
	c.SetAllowEIO3(true)
	c.SetCors(&types.Cors{
		Origin:      "*",
		Credentials: true,
	})

	// Inicialize o servidor Socket.IO
	httpserver = types.CreateServer(nil)
	server = socket.NewServer(httpserver, c)
	// Manipulador para novas conexões
	server.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		// Envie o status de emparelhamento a cada segundo
		ticker := time.NewTicker(1 * time.Second)
		go func() {
			for range ticker.C {
				//client.Emit("info", map[string]bool{"paired": isOnline})
				log.Println("[Pareamento] [v2] (⭍ THUNDERBOLT) PING SENT SUCCESSFULLY!")
				if isOnline {
					client.Emit("status", "true")
				} else {
					client.Emit("status", "false")
				}
			}
		}()

		// Manipulador para listar questionários
		client.On("list-questionaries", func(args ...any) {
			questionaries, err := readQuestionaries()
			if err != nil {
				log.Println("Erro ao ler questionários:", err)
				return
			}
			client.Emit("questionary", questionaries)
		})

		// Manipulador para upload de arquivos
		client.On("uploadFile", func(args ...any) {
			data := fmt.Sprintf("%v", args[0])
			filename := fmt.Sprintf("%x.qn", rand.Uint32())
			fileName := filepath.Join("upload", filename)

			file, Error := os.Create(fileName)

			if Error != nil {
				log.Println("Erro ao salvar arquivo:", Error)
				client.Emit("resultUpl", "{\"success\": false}")
				return
			}

			_, Error = file.WriteString(data)

			if Error != nil {
				log.Println("Erro ao salvar arquivo:", Error)
				client.Emit("resultUpl", "{\"success\": false}")
				return
			}

			client.Emit("resultUpl", "{\"success\": true}")
		})

		// Manipulador para desconexão
		client.On("disconnect", func(...any) {
			fmt.Println("Cliente desconectado:", client.Id())
			ticker.Stop()
		})
	})
	httpserver.Listen("0.0.0.0:3000", nil)

	// Rotas estáticas
	/*router.GET("/*filepath", func(c *gin.Context) {
		c.FileFromFS(c.Request.URL.Path, http.FS(subFS))
	})*/
	router.NoRoute(func(c *gin.Context) {
		c.FileFromFS(c.Request.URL.Path, http.FS(subFS))
	})
	setupAPIRoutes(router)
	go broadcastLogs()
	go startHTTPServer(router)

	time.Sleep(1 * time.Second)
	log.Println("[Pareamento] [v2] Sistema de pareamento \"THUNDERBOLT\" está ONLINE!")
	go NewArduinoPairer().Pair()
	select {}
}

func setupUploadDir() {
	if err := os.MkdirAll("upload", 0755); err != nil {
		log.Fatal("Erro ao criar diretório upload:", err)
	}
}

func setupFilesystem() fs.FS {
	subFS, err := fs.Sub(publicFS, "public")
	if err != nil {
		log.Fatal(err)
	}
	return subFS
}

func setupAPIRoutes(router *gin.Engine) {
	router.POST("/upload", func(c *gin.Context) {
		file, _ := c.FormFile("file")
		if file == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nenhum arquivo enviado"})
			return
		}

		dst := filepath.Join("upload", file.Filename)
		if err := c.SaveUploadedFile(file, dst); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "Arquivo recebido"})
	})
}

func startHTTPServer(router *gin.Engine) {
	if err := router.Run(":8080"); err != nil {
		log.Fatal("Erro ao iniciar servidor HTTP:", err)
	}
}

func sendLog(level, message string) {
	logChannel <- LogMessage{
		Level:   level,
		Message: message,
		Time:    time.Now().Format("15:04:05"),
	}
}

func broadcastLogs() {
	for msg := range logChannel {
		server.Emit("log", msg)
		log.Printf("[%s] %s", msg.Level, msg.Message)
	}
}

func EmitAll(event, msg string) {
	if event == "status" {
		if msg == "false" {
			isOnline = false
		} else if msg == "true" {
			isOnline = true
		}
	}
	server.Emit(event, msg)
}
