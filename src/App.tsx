import { useEffect, useState } from "react"
import "./App.css"

type Character = {
  id: number
  name: string
  real_name?: string
  deck?: string
  image?: {
    medium_url?: string
    screen_url?: string
    small_url?: string
  }
}

type Question = {
  character: Character
  options: Character[]
}

type LoadState = "loading" | "ready" | "empty" | "insufficient" | "error"

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentItem = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = currentItem
  }
  return shuffled
}

function buildRound(characters: Character[]): Question[] {
  return shuffle(characters)
    .slice(0, 10)
    .map((character) => {
      const distractors = shuffle(
        characters.filter((item) => item.id !== character.id),
      ).slice(0, 3)
      return { character, options: shuffle([character, ...distractors]) }
    })
}

function App() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>("loading")

  useEffect(() => {
    const controller = new AbortController()

    fetch("/data/marvel-characters.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Character data is unavailable")
        return response.json() as Promise<Character[]>
      })
      .then((data) => {
        const playable = data.filter(
          (character) =>
            character.image?.medium_url ||
            character.image?.screen_url ||
            character.image?.small_url,
        )
        setCharacters(playable)
        if (playable.length < 4) {
          setLoadState(data.length ? "insufficient" : "empty")
          return
        }
        setQuestions(buildRound(playable))
        setLoadState("ready")
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return
        setLoadState("error")
      })

    return () => controller.abort()
  }, [])

  const question = questions[questionIndex]
  const imageUrl =
    question?.character.image?.medium_url ??
    question?.character.image?.screen_url ??
    question?.character.image?.small_url
  const finished = loadState === "ready" && questionIndex >= questions.length

  function chooseAnswer(character: Character) {
    if (selectedId !== null || !question) return
    setSelectedId(character.id)
    if (character.id === question.character.id)
      setScore((currentScore) => currentScore + 1)
  }

  function continueQuiz() {
    setQuestionIndex((currentIndex) => currentIndex + 1)
    setSelectedId(null)
  }

  function playAgain() {
    setQuestions(buildRound(characters))
    setQuestionIndex(0)
    setSelectedId(null)
    setScore(0)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a
          className="wordmark"
          href="/"
          aria-label="Marvel character quiz home"
        >
          <span className="wordmark-mark">CV</span>
          <span>CHARACTER INDEX</span>
        </a>
        <div className="topbar-meta">
          <span className="status-dot" />
          <span>MARVEL EDITION</span>
        </div>
      </header>

      <section className="quiz-layout" aria-live="polite">
        <div className="quiz-copy">
          <p className="eyebrow">
            THE MARVEL CHARACTER QUIZ <span> / </span> 001
          </p>
          {finished ? (
            <>
              <h1>
                Round
                <br />
                complete<span className="headline-period">.</span>
              </h1>
              <p className="intro">
                You got{" "}
                <strong>
                  {score} of {questions.length}
                </strong>{" "}
                right.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={playAgain}
              >
                Play another round <span aria-hidden="true">↗</span>
              </button>
            </>
          ) : (
            <>
              <h1>
                Name that
                <br />
                character<span className="headline-period">.</span>
              </h1>
              <p className="intro">
                A face from the Marvel universe. Do you know their name?
              </p>
              {loadState === "ready" && question && (
                <div className="question-meta">
                  <span>
                    QUESTION {String(questionIndex + 1).padStart(2, "0")}{" "}
                    <span className="meta-muted">
                      / {String(questions.length).padStart(2, "0")}
                    </span>
                  </span>
                  <span>
                    SCORE <strong>{String(score).padStart(2, "0")}</strong>
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="quiz-stage">
          {loadState === "loading" && (
            <p className="stage-message">Loading character archive...</p>
          )}
          {loadState === "empty" && (
            <div className="stage-message empty-state">
              <p className="state-kicker">ARCHIVE EMPTY</p>
              <h2>Bring the roster in.</h2>
              <p>
                Add your Comic Vine key to <code>.env</code>, then run{" "}
                <code>npm run fetch:characters</code>.
              </p>
            </div>
          )}
          {loadState === "insufficient" && (
            <p className="stage-message">
              The archive needs at least four characters with images to start.
            </p>
          )}
          {loadState === "error" && (
            <p className="stage-message">
              Could not read the local character archive. Try fetching the data
              again.
            </p>
          )}
          {finished && (
            <div className="result-mark" aria-hidden="true">
              {String(score).padStart(2, "0")}
              <span>/ {questions.length}</span>
            </div>
          )}
          {loadState === "ready" && question && (
            <>
              <div className="portrait-frame">
                <img src={imageUrl} alt="Mystery Marvel character" />
                <span className="portrait-index">
                  FIG. {String(questionIndex + 1).padStart(2, "0")}
                </span>
                <span className="portrait-caption">IDENTIFY SUBJECT</span>
              </div>
              <div className="answer-panel">
                <div className="answer-heading">
                  <h2>Who is this?</h2>
                  <span>SELECT ONE</span>
                </div>
                <div className="answer-list">
                  {question.options.map((option, index) => {
                    const isCorrect = option.id === question.character.id
                    const isSelected = option.id === selectedId
                    const stateClass =
                      selectedId === null
                        ? ""
                        : isCorrect
                          ? " is-correct"
                          : isSelected
                            ? " is-incorrect"
                            : " is-muted"
                    return (
                      <button
                        className={`answer-option${stateClass}`}
                        type="button"
                        key={option.id}
                        disabled={selectedId !== null}
                        onClick={() => chooseAnswer(option)}
                      >
                        <span className="option-number">0{index + 1}</span>
                        <span>{option.name}</span>
                        {isCorrect && selectedId !== null && (
                          <span className="answer-feedback">
                            {isSelected ? "CORRECT" : "ANSWER"}
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="answer-feedback">NOT QUITE</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {selectedId !== null && (
                  <button
                    className="next-button"
                    type="button"
                    onClick={continueQuiz}
                  >
                    {questionIndex === questions.length - 1
                      ? "See results"
                      : "Next question"}{" "}
                    <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            </>
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
