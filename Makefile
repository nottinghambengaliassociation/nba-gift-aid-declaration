# Makefile – NBA Gift Aid declaration (Google Apps Script)
#
# Automates the copy-and-paste and deploy steps from README.md using
# Google's clasp command-line tool. Run `make` to see the commands.
#
# Needs: make, Node.js 18+ (which includes npm/npx).
# Works on macOS and Linux. On Windows, use WSL or Git Bash.

SHELL := /bin/bash

# clasp is pinned so the commands below keep working if a newer clasp changes them.
CLASP ?= npx --yes @google/clasp@2.4.2

PROJECT_TITLE ?= NBA Gift Aid declaration
DESC          ?= Release $(shell date '+%Y-%m-%d %H:%M')
ZIP_NAME      ?= nba-gift-aid-declaration.zip

DEPLOYMENT_FILE := .deployment-id
CODE_FILES      := Config.gs Code.gs Postcode.gs Records.gs Documents.gs Setup.gs
HTML_FILES      := Index.html Styles.html Client.html Logo.html
APP_FILES       := appsscript.json $(CODE_FILES) $(HTML_FILES)

# Reads JavaScript from stdin and reports syntax errors without running it.
SYNTAX_CHECK := new (require('vm').Script)(require('fs').readFileSync(0, 'utf8'))

OPEN := $(shell command -v xdg-open 2>/dev/null || command -v open 2>/dev/null || echo echo)

SCRIPT_ID     = $(shell [ -f .clasp.json ] && node -e "console.log(require('./.clasp.json').scriptId || '')")
DEPLOYMENT_ID = $(shell [ -f $(DEPLOYMENT_FILE) ] && cat $(DEPLOYMENT_FILE))

.DEFAULT_GOAL := help
.PHONY: help first-time tools enable-api login create link push open settings setup-steps \
        deploy release url deployments check zip clean

help: ## Show this list
	@echo ""
	@echo "NBA Gift Aid declaration – make commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-13s %s\n", $$1, $$2}'
	@echo ""
	@echo "First time?  make first-time"
	@echo "Updating?    make release"
	@echo ""

# ---------------------------------------------------------------------------
# First-time setup
# ---------------------------------------------------------------------------

first-time: tools enable-api login create push settings setup-steps ## Everything for a first install, in order

tools: ## Check Node.js is installed
	@command -v node >/dev/null || { echo "Node.js is not installed. Get it from https://nodejs.org (version 18 or newer)."; exit 1; }
	@node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)" || \
	  { echo "Node.js $$(node -v) is too old. Install version 18 or newer from https://nodejs.org"; exit 1; }
	@echo "✓ Node.js $$(node -v)"

enable-api: ## Turn on the Apps Script API for your account (one-time, in the browser)
	@echo ""
	@echo "clasp needs the Apps Script API switched on for connect@."
	@echo "  1. In a browser signed in ONLY as connect@ (an incognito window is easiest),"
	@echo "     open: https://script.google.com/home/usersettings"
	@echo "  2. Turn 'Google Apps Script API' ON."
	@echo ""
	@$(OPEN) "https://script.google.com/home/usersettings" >/dev/null 2>&1 || true
	@read -p "Press Enter once it's on… " _

login: ## Sign clasp in to Google (choose connect@ in the browser)
	@echo ""
	@echo "A browser window will open. Choose connect@nottinghambengaliassociation.co.uk."
	@echo "If Google shows a different account, click 'Use another account' and sign in as connect@."
	@echo ""
	$(CLASP) login

create: ## Create the Apps Script project (skipped if it already exists)
	@if [ -f .clasp.json ]; then \
	  echo "✓ Project already exists (script ID $(SCRIPT_ID))"; \
	else \
	  cp appsscript.json .appsscript.json.keep && \
	  $(CLASP) create --type standalone --title "$(PROJECT_TITLE)" --rootDir . ; \
	  status=$$?; mv -f .appsscript.json.keep appsscript.json; \
	  [ $$status -eq 0 ] || exit $$status; \
	  echo "✓ Created project '$(PROJECT_TITLE)'"; \
	fi

link: ## Use a project you already made in the browser: make link ID=<script ID>
	@[ -n "$(ID)" ] || { echo "Usage: make link ID=<script ID>  (find it in the editor under Project Settings → IDs)"; exit 1; }
	@[ ! -f .clasp.json ] || { echo ".clasp.json already exists (script ID $(SCRIPT_ID)). Delete it first to link a different project."; exit 1; }
	@printf '{"scriptId":"%s","rootDir":"."}\n' "$(ID)" > .clasp.json
	@echo "✓ Linked to project $(ID). Next: make push"

push: check ## Upload all code files to the project
	@[ -f .clasp.json ] || { echo "No project yet. Run 'make create' first."; exit 1; }
	$(CLASP) push --force
	@echo "✓ Code uploaded"

open: ## Open the project in the Apps Script editor
	@[ -n "$(SCRIPT_ID)" ] || { echo "No project yet. Run 'make create' first."; exit 1; }
	@echo "https://script.google.com/home/projects/$(SCRIPT_ID)/edit"
	@$(OPEN) "https://script.google.com/home/projects/$(SCRIPT_ID)/edit" >/dev/null 2>&1 || true

settings: ## Add the Ideal Postcodes key (opens Project Settings)
	@[ -n "$(SCRIPT_ID)" ] || { echo "No project yet. Run 'make create' first."; exit 1; }
	@echo ""
	@echo "The Ideal Postcodes key is kept out of the code, so add it by hand:"
	@echo "  1. In Project Settings, scroll to 'Script Properties' → 'Add script property'."
	@echo "  2. Property: IDEAL_POSTCODES_API_KEY   Value: the charity's key"
	@echo "  3. Click 'Save script properties'."
	@echo "Also set a daily lookup limit on the key in your Ideal Postcodes dashboard."
	@echo ""
	@$(OPEN) "https://script.google.com/home/projects/$(SCRIPT_ID)/settings" >/dev/null 2>&1 || \
	  echo "Open: https://script.google.com/home/projects/$(SCRIPT_ID)/settings"
	@read -p "Press Enter once the key is saved… " _

setup-steps: ## Run setup() and the tests in the editor (opens it)
	@[ -n "$(SCRIPT_ID)" ] || { echo "No project yet. Run 'make create' first."; exit 1; }
	@echo ""
	@echo "Google only lets you approve the app's permissions in the editor, so do this part there:"
	@echo "  1. Choose 'setup' in the function list and click Run. Allow the permissions."
	@echo "     ('Google hasn't verified this app' → Advanced → Go to … (unsafe) is normal.)"
	@echo "  2. Run 'checkSetup', 'testPostcodeLookup', 'testPdf' and 'testEmail' the same way."
	@echo "  3. Check the Execution log after each one."
	@echo "Then come back and run:  make deploy"
	@echo ""
	@$(OPEN) "https://script.google.com/home/projects/$(SCRIPT_ID)/edit" >/dev/null 2>&1 || \
	  echo "Open: https://script.google.com/home/projects/$(SCRIPT_ID)/edit"

# ---------------------------------------------------------------------------
# Deploying
# ---------------------------------------------------------------------------

deploy: ## Publish the web app (first time: new link; after that: same link, new version)
	@[ -f .clasp.json ] || { echo "No project yet. Run 'make create' first."; exit 1; }
	@if [ -n "$(DEPLOYMENT_ID)" ]; then \
	  echo "Updating the existing web app (link stays the same)…"; \
	  $(CLASP) deploy --deploymentId "$(DEPLOYMENT_ID)" --description "$(DESC)" || exit 1; \
	else \
	  echo "Creating the web app…"; \
	  out=$$($(CLASP) deploy --description "$(DESC)") || { echo "$$out"; exit 1; }; \
	  echo "$$out"; \
	  id=$$(echo "$$out" | grep -o 'AKfy[A-Za-z0-9_-]*' | head -1); \
	  [ -n "$$id" ] || { echo "Couldn't read the deployment ID from clasp's output."; exit 1; }; \
	  echo "$$id" > $(DEPLOYMENT_FILE); \
	fi
	@$(MAKE) --no-print-directory url

release: push deploy ## Upload the code and publish it (use this for every update)

url: ## Show the web app link
	@if [ -f $(DEPLOYMENT_FILE) ]; then \
	  echo ""; \
	  echo "Web app link: https://script.google.com/macros/s/$$(cat $(DEPLOYMENT_FILE))/exec"; \
	  echo ""; \
	else \
	  echo "Not deployed yet. Run 'make deploy'."; \
	fi

deployments: ## List all deployments of the project
	$(CLASP) deployments

# ---------------------------------------------------------------------------
# Housekeeping
# ---------------------------------------------------------------------------

check: ## Check the code for syntax errors before uploading
	@for f in $(APP_FILES); do [ -f "$$f" ] || { echo "Missing file: $$f"; exit 1; }; done
	@node -e "JSON.parse(require('fs').readFileSync('appsscript.json','utf8'))" || { echo "appsscript.json is not valid JSON"; exit 1; }
	@cat $(CODE_FILES) | node -e "$(SYNTAX_CHECK)" || { echo "Syntax error in a .gs file (see above)"; exit 1; }
	@sed -n '/<script>/,/<\/script>/p' Client.html | sed '1d;$$d' | node -e "$(SYNTAX_CHECK)" || { echo "Syntax error in Client.html (see above)"; exit 1; }
	@echo "✓ Code checks passed"

zip: check ## Make a zip of the project to share
	@rm -f "$(ZIP_NAME)"
	@zip -q "$(ZIP_NAME)" $(APP_FILES) README.md Makefile .claspignore
	@echo "✓ Created $(ZIP_NAME)"

clean: ## Remove temporary files (keeps the project link and deployment ID)
	@rm -f .appsscript.json.keep "$(ZIP_NAME)"
	@echo "✓ Cleaned"
