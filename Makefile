.DEFAULT_GOAL := all

SRCDIRS = src resources
SRCFILES = $(shell find $(SRCDIRS) -type f)
SOURCES = $(SRCFILES) appinfo.json

.PHONY: clean all install index

clean:
	pebble clean

build/discord-pebble.pbw: $(SOURCES)
	pebble build

all: build/discord-pebble.pbw

install: build/discord-pebble.pbw
	pebble install --log