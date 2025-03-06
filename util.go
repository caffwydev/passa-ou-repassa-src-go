package main

import (
	"fmt"
)

func VendorIDToString(vid uint16) string {
	return fmt.Sprintf("%04x", vid) // Formata como 4 dígitos hex minúsculos
}
