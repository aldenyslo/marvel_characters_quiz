import { memo, useEffect, useMemo, useState } from "react"
import "./App.css"

type Character = {
  name: string
  real_name?: string | null
  count_of_issue_appearances: number
}

type LoadState = "loading" | "ready" | "empty" | "error"
type IndexedCharacter = { character: Character; index: number }

const appearanceThresholds = [1000, 500, 100, 50, 10]
const placeholderNames = new Set(["unknown", "unrevealed"])
const compoundSurnameParts = new Map<string, string[]>([
  ["amaquelinboltagon", ["amaquelin", "boltagon"]],
  ["brantleeds", ["brant", "leeds"]],
  ["greysummers", ["grey", "summers"]],
  ["rossbanner", ["ross", "banner"]],
  ["mastersgrimm", ["masters", "grimm"]],
  ["moycastle", ["moy", "castle"]],
  ["halebrown", ["hale", "brown"]],
  ["leereynolds", ["lee", "reynolds"]],
  ["taylortemple", ["taylor", "temple"]],
])
const surnameParticles = new Set([
  "al",
  "ap",
  "da",
  "de",
  "del",
  "della",
  "den",
  "der",
  "di",
  "do",
  "dos",
  "du",
  "la",
  "le",
  "st",
  "ten",
  "ter",
  "van",
  "von",
  "zu",
  "zur",
])
const generationalSuffixPattern =
  /,?\s+(?:jr\.?|junior|sr\.?|senior|ii|iii|iv|v|vi|vii|viii|ix|x|\d+(?:st|nd|rd|th))$/i

function normalizeName(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*\[[^\]]*\]\s*$/, "")
    .replace(generationalSuffixPattern, "")
    .replace(/^(?:the|a|an)\s+/i, "")
    .replace(/\bdoctor\b/gi, "dr")
    .replace(/\bmister\b/gi, "mr")
    .replace(/\bmiss\b/gi, "ms")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function getSurname(realName: string): string {
  const nameWithoutSuffix = realName
    .replace(generationalSuffixPattern, "")
    .trim()
  const nameParts = nameWithoutSuffix.split(/\s+/)
  if (nameParts.length < 2) return ""

  let surnameStart = nameParts.length - 1
  while (
    surnameStart > 0 &&
    surnameParticles.has(normalizeName(nameParts[surnameStart - 1]))
  ) {
    surnameStart -= 1
  }
  return nameParts.slice(surnameStart).join(" ")
}

const CharacterRows = memo(function CharacterRows({
  rows,
  revealed,
}: {
  rows: IndexedCharacter[]
  revealed: Set<number>
}) {
  return (
    <>
      {rows.map(({ character, index }) => {
        const isRevealed = revealed.has(index)
        return (
          <div
            className={`character-row${isRevealed ? " is-revealed" : ""}`}
            key={index}
            role="listitem"
          >
            <span className="rank-cell">
              {String(index + 1).padStart(4, "0")}
            </span>
            <span className="character-cell">
              <span className="character-name">
                {isRevealed ? character.name : "Undiscovered"}
              </span>
              <span className="appearance-hint">
                {character.count_of_issue_appearances.toLocaleString()}{" "}
                appearances
              </span>
            </span>
          </div>
        )
      })}
    </>
  )
})

function App() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [nameIndex, setNameIndex] = useState<Map<string, number[]>>(
    () => new Map(),
  )
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set())
  const [guess, setGuess] = useState("")
  const [appearanceThreshold, setAppearanceThreshold] = useState(50)
  const [loadState, setLoadState] = useState<LoadState>("loading")

  const quizRows = useMemo(
    () =>
      characters.flatMap((character, index) =>
        character.count_of_issue_appearances > appearanceThreshold
          ? [{ character, index }]
          : [],
      ),
    [appearanceThreshold, characters],
  )
  const identifiedCount = useMemo(
    () =>
      quizRows.reduce(
        (count, row) => count + Number(revealed.has(row.index)),
        0,
      ),
    [quizRows, revealed],
  )

  useEffect(() => {
    const controller = new AbortController()

    fetch("/data/marvel-characters.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Character data is unavailable")
        return response.json() as Promise<Character[]>
      })
      .then((data) => {
        const sorted = data.toSorted(
          (left, right) =>
            right.count_of_issue_appearances -
              left.count_of_issue_appearances ||
            left.name.localeCompare(right.name),
        )
        const index = new Map<string, number[]>()
        sorted.forEach((character, characterIndex) => {
          const surname = character.real_name
            ? getSurname(character.real_name)
            : ""
          const names = new Set(
            [
              character.name,
              character.real_name ?? "",
              surname,
              ...(compoundSurnameParts.get(normalizeName(surname)) ?? []),
            ]
              .map(normalizeName)
              .filter((name) => name && !placeholderNames.has(name)),
          )
          names.forEach((name) => {
            const matches = index.get(name)
            if (matches) matches.push(characterIndex)
            else index.set(name, [characterIndex])
          })
        })
        setCharacters(sorted)
        setNameIndex(index)
        setLoadState(sorted.length ? "ready" : "empty")
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return
        setLoadState("error")
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const normalizedGuess = normalizeName(guess)
    if (loadState !== "ready" || !normalizedGuess) return

    const matchingIndexes = nameIndex
      .get(normalizedGuess)
      ?.filter(
        (index) =>
          characters[index].count_of_issue_appearances > appearanceThreshold &&
          !revealed.has(index),
      )
    if (!matchingIndexes?.length) return
    setRevealed((current) => new Set([...current, ...matchingIndexes]))
    setGuess("")
  }, [appearanceThreshold, characters, guess, loadState, nameIndex, revealed])

  function restart() {
    setRevealed(new Set())
    setGuess("")
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Character index home">
          <span className="wordmark-mark">CV</span>
          <span>CHARACTER INDEX</span>
        </a>
        <div className="topbar-meta">
          <span className="status-dot" />
          <span>MARVEL EDITION</span>
        </div>
      </header>

      <section className="index-layout">
        <div className="index-intro">
          <p className="eyebrow">
            THE MARVEL CHARACTER INDEX <span>/</span> 001
          </p>
          <h1>
            Name the
            <br />
            roster<span className="headline-period">.</span>
          </h1>
          <p className="intro">
            Guess a hero or their real name to reveal them in the archive.
          </p>

          <label className="guess-label" htmlFor="appearance-threshold">
            APPEARANCE THRESHOLD
          </label>
          <select
            id="appearance-threshold"
            className="guess-input threshold-select"
            value={appearanceThreshold}
            onChange={(event) =>
              setAppearanceThreshold(Number(event.currentTarget.value))
            }
            disabled={loadState !== "ready"}
          >
            {appearanceThresholds.map((threshold) => (
              <option key={threshold} value={threshold}>
                &gt; {threshold.toLocaleString()} appearances
              </option>
            ))}
          </select>

          <label className="guess-label" htmlFor="character-guess">
            ENTER A NAME
          </label>
          <input
            id="character-guess"
            className="guess-input"
            type="text"
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            placeholder="Character or real name"
            autoComplete="off"
            spellCheck={false}
            disabled={loadState !== "ready"}
          />

          <div className="progress-row" aria-live="polite">
            <span>IDENTIFIED</span>
            <strong>
              {identifiedCount.toLocaleString()} /{" "}
              {quizRows.length.toLocaleString()}
            </strong>
          </div>
          <button
            className="restart-button"
            type="button"
            onClick={restart}
            disabled={revealed.size === 0 && guess.length === 0}
          >
            <span aria-hidden="true">↺</span> Clear and restart
          </button>
        </div>

        <div className="archive-panel">
          <div className="archive-heading">
            <div>
              <p className="state-kicker">APPEARANCE RANKING</p>
              <h2>Character archive</h2>
            </div>
            <span className="archive-total">
              {quizRows.length.toLocaleString()} ENTRIES
            </span>
          </div>

          {loadState === "loading" && (
            <p className="archive-message">Loading character archive...</p>
          )}
          {loadState === "empty" && (
            <p className="archive-message">The character archive is empty.</p>
          )}
          {loadState === "error" && (
            <p className="archive-message">
              Could not read the local character archive. Try fetching the data
              again.
            </p>
          )}
          {loadState === "ready" && (
            <div
              className="table-scroll"
              role="region"
              aria-label="Character archive"
            >
              <div className="character-grid" role="list">
                <CharacterRows rows={quizRows} revealed={revealed} />
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="footer-bar">
        <span>POWERED BY COMIC VINE</span>
        <span>
          {characters.length
            ? `${characters.length.toLocaleString()} CHARACTERS IN ARCHIVE`
            : "LOCAL CHARACTER ARCHIVE"}
        </span>
      </footer>
    </main>
  )
}

export default App
