import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const rawInputPath = resolve(rootDir, "data/raw/marvel-characters.json")
const publicOutputPath = resolve(rootDir, "public/data/marvel-characters.json")
const temporaryOutputPath = `${publicOutputPath}.tmp`

const rawCharacters = JSON.parse(await readFile(rawInputPath, "utf8"))

if (!Array.isArray(rawCharacters)) {
  throw new Error("The raw Marvel character archive is not a JSON array.")
}

const mapGender = (value) => {
  if (value == null) return null
  if (typeof value === "string") return value

  switch (Number(value)) {
    case 1:
      return "Male"
    case 2:
      return "Female"
    case 0:
      return "None"
    default:
      return value
  }
}

const parsedCharacters = rawCharacters
  .filter(
    (character) => Number(character.count_of_issue_appearances ?? 0) >= 10,
  )
  .map((character) => ({
    name: character.name ?? null,
    real_name: character.real_name ?? null,
    deck: character.deck ?? null,
    count_of_issue_appearances: Number(
      character.count_of_issue_appearances ?? 0,
    ),
    gender: mapGender(character.gender?.name ?? character.gender ?? null),
  }))
  .sort(
    (left, right) =>
      right.count_of_issue_appearances - left.count_of_issue_appearances,
  )

await mkdir(dirname(publicOutputPath), { recursive: true })
await writeFile(
  temporaryOutputPath,
  `${JSON.stringify(parsedCharacters, null, 2)}\n`,
)
await rename(temporaryOutputPath, publicOutputPath)

console.log(
  `Parsed ${parsedCharacters.length} Marvel characters into ${publicOutputPath}`,
)
