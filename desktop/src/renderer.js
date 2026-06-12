const $ = (id) => document.getElementById(id)
const branchList = $('branchList')
const commandBox = $('commandBox')
const copyBtn = $('copyBtn')
const refreshBtn = $('refreshBtn')
const gitVersionEl = $('gitVersion')

let branches = []
let selectedBranch = null

const STEPS = {
  stage: [
    { label: '1. Cambiar a stage', cmd: 'git checkout stage' },
    { label: '2. Ver estado', cmd: 'git status' },
    { label: '3. Agregar cambios', cmd: 'git add .' },
    { label: '4. Hacer commit', cmd: 'git commit -m "descripción del cambio"' },
    { label: '5. Subir a stage', cmd: 'git push origin stage' },
    { cmd: '' },
    { label: '6. Cambiar a main', cmd: 'git checkout main' },
    { label: '7. Traer cambios de stage', cmd: 'git merge stage' },
    { label: '8. Subir a producción', cmd: 'git push origin main' },
    { label: '9. Volver a stage', cmd: 'git checkout stage' },
  ],
  main: [
    { label: '1. Ver diferencias con stage', cmd: 'git log ..origin/stage --oneline' },
    { label: '2. Traer cambios de stage', cmd: 'git merge stage' },
    { label: '3. Subir a producción', cmd: 'git push origin main' },
  ],
  other: (name) => [
    { label: '1. Ver estado', cmd: 'git status' },
    { label: '2. Agregar cambios', cmd: 'git add .' },
    { label: '3. Hacer commit', cmd: `git commit -m "descripción del cambio"` },
    { label: '4. Subir cambios', cmd: `git push origin ${name}` },
  ],
}

function getSteps(name) {
  if (name === 'stage') return STEPS.stage
  if (name === 'main') return STEPS.main
  return STEPS.other(name)
}

async function loadBranches() {
  if (!window.gitAPI) {
    branchList.innerHTML = '<li style="color:var(--error)">Error: gitAPI no disponible</li>'
    return
  }
  try {
    branches = await window.gitAPI.listBranches()
    renderBranches()
    const ver = await window.gitAPI.gitVersion()
    gitVersionEl.textContent = ver
  } catch (err) {
    branchList.innerHTML = `<li style="color:var(--error)">Error: ${err}</li>`
  }
}

function renderBranches() {
  branchList.innerHTML = ''
  for (const b of branches) {
    const li = document.createElement('li')
    li.textContent = b.name
    if (b.current) li.classList.add('current')
    if (selectedBranch === b.name) li.classList.add('active')

    const badge = document.createElement('span')
    badge.className = 'badge'
    if (b.current) {
      badge.classList.add('current-badge')
      badge.textContent = 'actual'
    } else if (selectedBranch === b.name) {
      badge.classList.add('active-badge')
      badge.textContent = 'seleccionada'
    } else {
      badge.style.display = 'none'
    }
    li.appendChild(badge)

    li.addEventListener('click', () => selectBranch(b.name))
    branchList.appendChild(li)
  }
}

function selectBranch(name) {
  selectedBranch = name
  renderBranches()

  const steps = getSteps(name)
  const lines = steps.map(s => {
    if (!s.cmd) return ''
    return s.label ? `# ${s.label}\n${s.cmd}` : s.cmd
  })
  commandBox.textContent = lines.join('\n').trim()
  copyBtn.style.display = 'inline-block'
}

copyBtn.addEventListener('click', async () => {
  const text = commandBox.textContent
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    const orig = copyBtn.textContent
    copyBtn.textContent = '✅ Copiado'
    setTimeout(() => { copyBtn.textContent = orig }, 1500)
  } catch {
    const sel = window.getSelection()
    sel?.removeAllRanges()
    const range = document.createRange()
    range.selectNodeContents(commandBox)
    sel?.addRange(range)
  }
})

refreshBtn.addEventListener('click', loadBranches)

document.addEventListener('DOMContentLoaded', loadBranches)
