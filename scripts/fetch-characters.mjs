import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const apiKey = process.env.COMICVINE_API_KEY
if (!apiKey) {
  throw new Error(
    "Missing COMICVINE_API_KEY. Add your key to .env before running this command.",
  )
}

const apiRoot = "https://comicvine.gamespot.com/api"
const rawOutputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../data/raw/marvel-characters.json",
)
const temporaryRawOutputPath = `${rawOutputPath}.tmp`
const fields = [
  "id",
  "name",
  "real_name",
  "deck",
  "image",
  "publisher",
  "gender",
  "origin",
  "site_detail_url",
  "count_of_issue_appearances",
  "first_appeared_in_issue",
  "teams",
].join(",")
const requestedCount =
  process.argv[2] === undefined
    ? Number.POSITIVE_INFINITY
    : Number(process.argv[2])

if (
  requestedCount !== Number.POSITIVE_INFINITY &&
  !(requestedCount > 0 && Number.isInteger(requestedCount))
) {
  throw new Error("Character count must be a positive integer.")
}

async function request(resource, parameters) {
  const url = new URL(`${apiRoot}/${resource}/`)
  url.search = new URLSearchParams({
    api_key: apiKey,
    format: "json",
    ...parameters,
  })

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let response
    try {
      response = await fetch(url)
    } catch (error) {
      if (attempt === 4) throw error
      console.warn(`Network error; retrying request (${attempt}/3).`)
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, attempt * 2000),
      )
      continue
    }

    if ([502, 503, 504].includes(response.status) && attempt < 4) {
      console.warn(
        `Comic Vine returned HTTP ${response.status}; retrying request (${attempt}/3).`,
      )
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, attempt * 2000),
      )
      continue
    }
    if (!response.ok)
      throw new Error(`Comic Vine returned HTTP ${response.status}`)

    const payload = await response.json()
    if (payload.status_code !== 1) {
      throw new Error(
        `Comic Vine API error: ${payload.error ?? "Unknown error"} (${payload.status_code})`,
      )
    }
    return payload
  }
}

async function readExistingCharacters(filePath) {
  try {
    const data = JSON.parse(await readFile(filePath, "utf8"))
    if (!Array.isArray(data)) {
      throw new Error(
        `The existing archive at ${filePath} is not a JSON array.`,
      )
    }
    return data
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
}

async function writeCharacters(filePath, characters) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(
    temporaryRawOutputPath,
    `${JSON.stringify(characters, null, 2)}\n`,
  )
  await rename(temporaryRawOutputPath, filePath)
}

const publisherPayload = await request("publishers", {
  field_list: "id,name",
  filter: "name:Marvel",
  limit: "100",
})
const publisher = publisherPayload.results.find(
  (result) => result.name?.toLowerCase() === "marvel",
)

if (!publisher) {
  throw new Error('Comic Vine did not return a publisher named "Marvel".')
}

const limit = 100
const publisherDetail = await request(`publisher/4010-${publisher.id}`, {
  field_list: "id,name,characters",
})
const characterRefs = publisherDetail.results.characters.slice(
  0,
  requestedCount,
)
const existingCharacters = await readExistingCharacters(rawOutputPath)
const charactersById = new Map(
  existingCharacters
    .filter((character) => character.publisher?.id === publisher.id)
    .map((character) => [character.id, character]),
)

for (let offset = 0; offset < characterRefs.length; offset += limit) {
  const batch = characterRefs.slice(offset, offset + limit)
  const missingBatch = batch.filter(({ id }) => !charactersById.has(id))

  if (missingBatch.length) {
    const payload = await request("characters", {
      field_list: fields,
      filter: `id:${missingBatch.map(({ id }) => id).join("|")}`,
      limit: String(limit),
    })

    for (const character of payload.results) {
      if (character.publisher?.id !== publisher.id) {
        throw new Error(`Received non-Marvel character: ${character.name}`)
      }
      charactersById.set(character.id, character)
    }
  }

  if (missingBatch.length) {
    const completedCharacters = characterRefs
      .slice(0, offset + batch.length)
      .map(({ id }) => charactersById.get(id))
      .filter((character) => character !== undefined)
    await writeCharacters(rawOutputPath, completedCharacters)

    console.log(
      `Saved ${completedCharacters.length} of ${characterRefs.length} Marvel characters`,
    )

    if (offset + batch.length < characterRefs.length)
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000))
  }
}

const characters = characterRefs
  .map(({ id }) => charactersById.get(id))
  .filter((character) => character !== undefined)

if (characters.length !== characterRefs.length) {
  throw new Error(
    `Expected ${characterRefs.length} Marvel characters but fetched ${characters.length}.`,
  )
}

await writeCharacters(rawOutputPath, characters)

console.log(
  `Saved ${characters.length} raw Marvel characters to ${rawOutputPath}`,
)
