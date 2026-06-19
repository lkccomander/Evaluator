package main

import (
	"bytes"
	"fmt"
	"net/http"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/joho/godotenv"
)

type testStatus int

const (
	statusPending testStatus = iota
	statusRunning
	statusPass
	statusFail
)

type endpointTest struct {
	name       string
	url        string
	method     string
	body       string
	expectCode int
	status     testStatus
	gotCode    int
	duration   time.Duration
	err        error
	respBody   string
}

type summary struct {
	total   int
	passed  int
	failed  int
	minTime time.Duration
	maxTime time.Duration
}

type testMsg int
type doneMsg summary
type errMsg struct {
	index int
	err   error
}

type model struct {
	tests    []*endpointTest
	index    int
	spinner  spinner.Model
	summary  *summary
	done     bool
	quitting bool
	err      error
	width    int
	height   int
	showHelp bool
	styles   *styles
}

type styles struct {
	base     lipgloss.Style
	title    lipgloss.Style
	pass     lipgloss.Style
	fail     lipgloss.Style
	running  lipgloss.Style
	pending  lipgloss.Style
	urlStyle lipgloss.Style
	keyStyle lipgloss.Style
	help     lipgloss.Style
	footer   lipgloss.Style
	summaryK lipgloss.Style
	summaryV lipgloss.Style
	accent   lipgloss.Style
	dim      lipgloss.Style
	bar      lipgloss.Style
}

var (
	accentColor  = lipgloss.Color("#F59E0B")
	greenColor   = lipgloss.Color("#22C55E")
	redColor     = lipgloss.Color("#EF4444")
	grayColor    = lipgloss.Color("#6B7280")
	dimColor     = lipgloss.Color("#374151")
	fgColor      = lipgloss.Color("#F9FAFB")
	bgColor      = lipgloss.Color("#0C0C0C")
	borderColor  = lipgloss.Color("#1F2937")
	helpColor    = lipgloss.Color("#9CA3AF")
	summaryKCol  = lipgloss.Color("#D1D5DB")
)

func defaultStyles() *styles {
	s := &styles{}
	s.base = lipgloss.NewStyle().Padding(0, 1)
	s.title = lipgloss.NewStyle().
		Foreground(accentColor).
		Bold(true).
		Padding(0, 1)
	s.pass = lipgloss.NewStyle().Foreground(greenColor).Bold(true)
	s.fail = lipgloss.NewStyle().Foreground(redColor).Bold(true)
	s.running = lipgloss.NewStyle().Foreground(accentColor)
	s.pending = lipgloss.NewStyle().Foreground(grayColor)
	s.urlStyle = lipgloss.NewStyle().Foreground(grayColor).Faint(true)
	s.keyStyle = lipgloss.NewStyle().Foreground(accentColor).Bold(true)
	s.help = lipgloss.NewStyle().Foreground(helpColor)
	s.footer = lipgloss.NewStyle().Foreground(grayColor)
	s.summaryK = lipgloss.NewStyle().Foreground(summaryKCol).Bold(true)
	s.summaryV = lipgloss.NewStyle().Foreground(fgColor).Bold(true)
	s.accent = lipgloss.NewStyle().Foreground(accentColor)
	s.dim = lipgloss.NewStyle().Foreground(grayColor)
	s.bar = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#1F2937")).
		Padding(0, 1)
	return s
}

func loadConfig() {
	godotenv.Load()
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getTimeout() time.Duration {
	secStr := getEnv("TEST_TIMEOUT", "5")
	sec, err := strconv.Atoi(secStr)
	if err != nil || sec <= 0 {
		sec = 5
	}
	return time.Duration(sec) * time.Second
}

func buildTests() []*endpointTest {
	apiBase := getEnv("API_BASE_URL", "http://localhost:8080")
	frontendURL := getEnv("FRONTEND_URL", "http://localhost:5173")

	httpDo := func(method, url, body string, expectedCode int) *endpointTest {
		return &endpointTest{
			method:     method,
			url:        url,
			body:       body,
			expectCode: expectedCode,
			status:     statusPending,
		}
	}

	return []*endpointTest{
		httpDo("GET", apiBase+"/health", "", 200),
		httpDo("GET", apiBase+"/api/v1/matches", "", 200),
		httpDo("GET", apiBase+"/api/v1/public/settings", "", 200),
		httpDo("GET", apiBase+"/api/v1/leaderboard/history", "", 200),
		httpDo("POST", apiBase+"/api/v1/auth/login",
			`{"email":"`+getEnv("TEST_EMAIL", "noop@test.com")+`","password":"`+getEnv("TEST_PASSWORD", "bad")+`"}`,
			200),
		httpDo("GET", apiBase+"/api/v1/banner", "", 200),
		httpDo("GET", frontendURL, "", 200),
		httpDo("OPTIONS", apiBase+"/api/v1/matches", "", 200),
	}
}

func endpointName(t *endpointTest) string {
	path := strings.TrimPrefix(t.url, getEnv("API_BASE_URL", "http://localhost:8080"))
	path = strings.TrimPrefix(path, getEnv("FRONTEND_URL", "http://localhost:5173"))
	if path == "" {
		path = "/"
	}
	return path
}

func runTest(t *endpointTest) {
	start := time.Now()

	client := &http.Client{Timeout: getTimeout()}
	var bodyReader io.Reader
	if t.body != "" {
		bodyReader = strings.NewReader(t.body)
	}
	req, err := http.NewRequest(t.method, t.url, bodyReader)
	if err != nil {
		t.err = err
		t.status = statusFail
		t.duration = time.Since(start)
		return
	}

	if t.body != "" {
		req.Header.Set("Content-Type", "application/json")
	}

	if t.method == "OPTIONS" {
		req.Header.Set("Origin", getEnv("FRONTEND_URL", "http://localhost:5173"))
	}

	req.Header.Set("User-Agent", "quiniela-connectivity-tui/1.0")

	resp, err := client.Do(req)
	t.duration = time.Since(start)
	if err != nil {
		t.err = err
		t.status = statusFail
		return
	}
	defer resp.Body.Close()

	t.gotCode = resp.StatusCode

	buf := new(bytes.Buffer)
	buf.ReadFrom(resp.Body)
	t.respBody = buf.String()

	if resp.StatusCode == t.expectCode {
		t.status = statusPass
	} else {
		bodySnippet := t.respBody
		if len(bodySnippet) > 120 {
			bodySnippet = bodySnippet[:117] + "..."
		}
		if bodySnippet != "" {
			t.err = fmt.Errorf("expected %d, got %d — %s", t.expectCode, resp.StatusCode, bodySnippet)
		} else {
			t.err = fmt.Errorf("expected %d, got %d", t.expectCode, resp.StatusCode)
		}
		t.status = statusFail
	}

	if t.method == "OPTIONS" && t.status == statusPass {
		acr := resp.Header.Get("Access-Control-Allow-Origin")
		if acr == "" {
			t.err = fmt.Errorf("missing Access-Control-Allow-Origin header")
			t.status = statusFail
		}
	}
}

func initialModel() model {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(accentColor)

	return model{
		tests:   buildTests(),
		spinner: s,
		summary: &summary{},
		styles:  defaultStyles(),
	}
}

func (m model) Init() tea.Cmd {
	return tea.Batch(m.spinner.Tick, runNextTest(m))
}

func runNextTest(m model) tea.Cmd {
	if m.index >= len(m.tests) {
		return nil
	}
	m.tests[m.index].status = statusRunning
	return func() tea.Msg {
		runTest(m.tests[m.index])
		return testMsg(m.index)
	}
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "esc", "ctrl+c":
			m.quitting = true
			return m, tea.Quit
		case "r":
			if m.done {
				m.tests = buildTests()
				m.index = 0
				m.done = false
				m.summary = &summary{}
				return m, tea.Batch(m.spinner.Tick, runNextTest(m))
			}
		case "h":
			m.showHelp = !m.showHelp
			return m, nil
		}
		return m, nil

	case testMsg:
		i := int(msg)
		m.index = i + 1
		if m.tests[i].status == statusPass {
			m.summary.passed++
		} else {
			m.summary.failed++
		}
		d := m.tests[i].duration
		if m.summary.total == 0 || d < m.summary.minTime {
			m.summary.minTime = d
		}
		if d > m.summary.maxTime {
			m.summary.maxTime = d
		}
		m.summary.total++

		if m.index >= len(m.tests) {
			m.done = true
			return m, nil
		}
		m.tests[m.index].status = statusRunning
		return m, func() tea.Msg {
			runTest(m.tests[m.index])
			return testMsg(m.index)
		}

	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd
	}

	return m, nil
}

func (m model) View() string {
	if m.quitting {
		return m.styles.dim.Render("\n  bye.\n")
	}

	var b strings.Builder

	b.WriteString(renderHeader(m))
	b.WriteString("\n")

	if !m.done {
		for i, t := range m.tests {
			b.WriteString(renderTestRow(m, t, i))
			b.WriteString("\n")
		}
	} else {
		for i, t := range m.tests {
			b.WriteString(renderTestRow(m, t, i))
			b.WriteString("\n")
		}
	}

	b.WriteString(renderDivider(m))
	b.WriteString("\n")

	if m.done {
		b.WriteString(renderSummary(m))
	} else {
		b.WriteString(renderProgress(m))
	}

	b.WriteString("\n")
	b.WriteString(renderFooter(m))

	if m.showHelp {
		b.WriteString("\n")
		b.WriteString(renderHelp(m))
	}

	return lipgloss.NewStyle().Width(m.width).Render(b.String())
}

func renderHeader(m model) string {
	title := m.styles.title.Render("🔌 Quiniela 2026 — Connectivity Tester")
	envIndicator := m.styles.dim.Render(fmt.Sprintf("env: %s", getEnv("API_BASE_URL", "?")))
	return lipgloss.JoinHorizontal(lipgloss.Top, title, "  ", envIndicator)
}

func renderTestRow(m model, t *endpointTest, i int) string {
	var icon string
	switch t.status {
	case statusPending:
		icon = m.styles.pending.Render("○")
	case statusRunning:
		icon = m.styles.running.Render(m.spinner.View())
	case statusPass:
		icon = m.styles.pass.Render("●")
	case statusFail:
		icon = m.styles.fail.Render("●")
	}

	path := endpointName(t)
	fullURL := t.url
	if len(fullURL) > 60 {
		fullURL = fullURL[:57] + "..."
	}

	var timeStr string
	if t.duration > 0 {
		if t.duration < time.Second {
			timeStr = fmt.Sprintf("%dms", t.duration.Milliseconds())
		} else {
			timeStr = fmt.Sprintf("%.2fs", t.duration.Seconds())
		}
	} else {
		timeStr = "---"
	}

	var codeStr string
	if t.gotCode > 0 {
		codeStr = fmt.Sprintf("%d", t.gotCode)
	} else {
		codeStr = "---"
	}

	expectStr := fmt.Sprintf("→%d", t.expectCode)

	left := fmt.Sprintf("%s %s", icon, t.name)
	leftRendered := m.styles.base.Render(left)

	mid := m.styles.urlStyle.Render(fmt.Sprintf("%s %s", t.method, path))

	rightColor := m.styles.dim
	if t.status == statusPass {
		rightColor = m.styles.pass
	} else if t.status == statusFail {
		rightColor = m.styles.fail
	}

	right := rightColor.Render(fmt.Sprintf("%s %s %s", timeStr, codeStr, expectStr))

	long := fmt.Sprintf("  %s  %s", leftRendered, mid)
	if m.width > 0 {
		padding := m.width - lipgloss.Width(long) - lipgloss.Width(right)
		if padding < 1 {
			padding = 1
		}
		line := long + strings.Repeat(" ", padding) + right
		if t.status == statusFail && t.err != nil {
			line += "\n" + m.styles.fail.Render("    └─ "+t.err.Error())
		}
		return line
	}
	line := long + "  " + right
	if t.status == statusFail && t.err != nil {
		line += "\n" + m.styles.fail.Render("    └─ "+t.err.Error())
	}
	return line
}

func renderProgress(m model) string {
	done := m.index
	total := len(m.tests)
	bar := m.styles.bar.Render(fmt.Sprintf("  [%d/%d] tests completed", done, total))
	return bar
}

func renderSummary(m model) string {
	var b strings.Builder
	s := m.summary

	b.WriteString(fmt.Sprintf("  %s %s\n", m.styles.summaryK.Render("Total:"), m.styles.summaryV.Render(fmt.Sprintf("%d", s.total))))
	b.WriteString(fmt.Sprintf("  %s %s\n", m.styles.summaryK.Render("Passed:"), m.styles.pass.Render(fmt.Sprintf("%d", s.passed))))
	b.WriteString(fmt.Sprintf("  %s %s\n", m.styles.summaryK.Render("Failed:"), m.styles.fail.Render(fmt.Sprintf("%d", s.failed))))
	b.WriteString(fmt.Sprintf("  %s %s\n", m.styles.summaryK.Render("Fastest:"), m.styles.summaryV.Render(fmt.Sprintf("%v", s.minTime.Round(time.Millisecond)))))
	b.WriteString(fmt.Sprintf("  %s %s", m.styles.summaryK.Render("Slowest:"), m.styles.summaryV.Render(fmt.Sprintf("%v", s.maxTime.Round(time.Millisecond)))))

	if s.failed > 0 {
		b.WriteString("\n\n")
		b.WriteString(m.styles.fail.Render("  Some tests failed. Check details above."))
	}

	return b.String()
}

func renderDivider(m model) string {
	line := strings.Repeat("─", clamp(m.width, 40, 80))
	return m.styles.dim.Render("  " + line)
}

func renderFooter(m model) string {
	var hints []string
	if m.done {
		hints = append(hints, m.styles.keyStyle.Render("r")+m.styles.footer.Render(" re-run"))
	}
	hints = append(hints, m.styles.keyStyle.Render("h")+m.styles.footer.Render(" help"))
	hints = append(hints, m.styles.keyStyle.Render("q")+m.styles.footer.Render(" quit"))

	return m.styles.footer.Render("  " + strings.Join(hints, " · "))
}

func renderHelp(m model) string {
	help := `
  ─────────────────────────────────────
   Keys:
     r   Re-run all tests
     h   Toggle this help
     q   Quit

   Tests:
     • API Health          GET  /health
     • API Matches         GET  /api/v1/matches
     • API Settings        GET  /api/v1/public/settings
     • API Leaderboard     GET  /api/v1/leaderboard/history
     • API Auth Login      POST /api/v1/auth/login
     • API Banner          GET  /api/v1/banner
     • Frontend            GET  /
     • CORS Headers        OPTIONS /api/v1/matches

   Config file: tools/.env
  ─────────────────────────────────────`
	return m.styles.help.Render(help)
}

func clamp(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func main() {
	loadConfig()

	p := tea.NewProgram(
		initialModel(),
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)

	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}
