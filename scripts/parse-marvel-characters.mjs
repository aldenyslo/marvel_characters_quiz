import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const rawInputPath = resolve(rootDir, "data/raw/marvel-characters.json")
const publicOutputPath = resolve(rootDir, "public/data/marvel-characters.json")
const temporaryOutputPath = `${publicOutputPath}.tmp`
const discardedCharacterNames = [
  // Add character names to exclude from parsed output.
  "Gandy Goose",
  "Sourpuss",
  "Super Bunny",
  "Willie Tanner",
  "Brian Tanner",
  "Kate Tanner",
  "Lynn Tanner",
  "Oscar Pig",
  "Emirate Xaaron",
  "Hokey Wolf",
  "Bertie Mouse",
  "Andy Wolf",
  "Ninth Sister",
  "Circuit Breaker",
  "Thanoth",
  "Joy Meadows",
  "Frenchy Rabbit",
  "E. Claude Pennygrabber",
  "Ginch",
  "Wacky Willie",
]
const discardedFirstAppearanceIssueNameFragments = [
  // Add issue-name fragments to exclude matching characters from parsed output.
  "Krazy Komics!",
  "The Meet at Mount Ono",
  "To Fail is to Conquer...To Succeed is to Die!",
  "Escape From Castle Destro",
  "Zartan!",
  "Operation: Lady Doomsday; ...Hot Potato!",
  "Twin Brothers",
  "Huckleberry Hound",
  "Book I, Part I: Vader",
]
const realNamePatches = {
  // Add entries as "Character name": "Real name".
  "Celeste Cuckoo": "Celeste Cuckoo",
  "Charlotte Jones": "Charlotte Jones",
  "Eric Koenig": "Eric Koenig",
  "Kristoff Vernard": "Kristoff Vernard",
  "Nancy Brown": "Nancy Brown-Hale",
  "Alysande Stuart": "Alysande Stuart",
  "Marie Lathrop": "Marie Lathrop",
  "Ziran the Tester": "Ziran",
  "Toni Turner": "Antoinette Turner",
  "Kurt Marko": "Kurt Marko",
  "Nezarr the Calculator": "Nezarr",
  "Alia Gregor": "Alia Gregor",
  "Jeff Bannister": "Jeffrey Bannister",
  "Archie Corrigan": "Archibald Corrigan",
  "Jason Ionello": "Jason Ionello",
  "Spike Freeman": "Spike Freeman",
  "Lodus Logos": "Lodus Logos",
  "Agent Deems": "Deems",
  "Doyle Dormammu": "Doyle Dormammu",
  "Tante Mattie": "Mattie Baptiste",
  "Geoffrey Wilder": "Geoffrey Wilder",
  "Algernon Crowe": "Algernon Crowe",
  "Blackjack O'Hare": "Blackjack O'Hare",
  "Morgana Blessing": "Morgana Blessing",
  "Susan Austin": "Susan Austin",
  "Jim Lathrop": "Jim Lathrop",
  "Oneg the Prober": "Oneg",
  "Jemiah the Analyzer": "Jemiah",
  "Doctor Sun": "Sun",
  "Lindy Reynolds": "Lindy Lee-Reynolds",
  "Victoria von Frankenstein": "Victoria von Frankenstein",
  "Tamara Rahn": "Tamara Rahn",
  "Gena Landers": "Gena Landers",
  "Kobak Never-Held": "Kobak",
  "Barney Bushkin": "Barney Bushkin",
  "Senator Harrington Byrd": "Harrington Byrd",
  "Belle Taylor": "Belle Taylor-Temple",
  "Jack Frost": "Isabrot",
  "Billie Morales": "Billie Morales",
  "Neal Conan": "Neal Conan",
  "Tefral the Surveyor": "Tefral",
  "Hargen the Measurer": "Hargen",
  "Winston Frost": "Winston Frost",
  "Killian Devo": "Killian Devo",
  "Jon Ironfire": "Jon Ironfire",
  "Opal Vetiver": "Opal Vetiver",
  "Police Chief Tai": "Tai",
  "Gomurr the Ancient": "Gomurr",
  "Gudrun Tyburn": "Gudrun Tyburn",
  "Augusta Bromes": "Augusta Bromes",
  "Syzya of the Smoke": "Syzya",
  "Carmilla Frost": "Carmilla Frost",
}
const characterAliases = new Map([
  // Add entries as ["Character name", ["alias", "another alias"]].
  ["Betsy Braddock", ["Psylocke", "Captain Britain"]],
  ["Carol Danvers", ["Captain Marvel"]],
  ["Hank Pym", ["Ant-Man"]],
  ["Norman Osborn", ["Green Goblin"]],
  ["Sam Wilson", ["Falcon", "Captain America"]],
  ["Bucky Barnes", ["Winter Soldier"]],
  ["Flash Thompson", ["Agent Venom"]],
  ["Moira MacTaggert", ["Moira X"]],
  ["Madrox", ["Multiple Man"]],
  ["Thunderbolt Ross", ["Red Hulk"]],
  ["Quentin Quire", ["Kid Omega"]],
  ["Miles Morales", ["Spider-Man"]],
  ["Madelyne Pryor", ["Goblin Queen"]],
  ["Eddie Brock", ["Venom"]],
  ["Jim Hammond", ["Human Torch"]],
  ["Monica Rambeau", ["Photon", "Spectrum"]],
  ["Drax the Destroyer", ["Drax"]],
  ["Kraven the Hunter", ["Kraven"]],
  ["Kamala Khan", ["Ms. Marvel"]],
  ["Sharon Carter", ["Agent 13"]],
  ["Ben Reilly", ["Scarlet Spider"]],
  ["Kate Bishop", ["Hawkeye"]],
  ["Amadeus Cho", ["Brawn"]],
  ["Sam Alexander", ["Nova"]],
  ["Heather McNeil Hudson", ["Vindicator"]],
  ["Abe Jenkins", ["Beetle"]],
  ["Cassie Lang", ["Stature"]],
  ["John Jameson", ["Man-Wolf"]],
  ["Julia Carpenter", ["Spider-Woman", "Madame Web"]],
  ["Noh-Varr", ["Marvel Boy"]],
  ["Rusty Collins", ["Firefist"]],
  ["Andreas von Strucker", ["Fenris"]],
  ["Cletus Kasady", ["Carnage"]],
  ["Angel Salvadore", ["Tempest"]],
  ["Jamie Braddock", ["Monarch"]],
  ["Jack Monroe", ["Nomad"]],
  ["Andrea von Strucker", ["Fenris"]],
  ["Eric O'Grady", ["Ant-Man"]],
  ["Heather McDaniel Hudson", ["Sasquatch"]],
  ["Hobie Brown", ["Prowler", "Hornet"]],
  ["Ava Ayala", ["White Tiger"]],
  ["Nadia van Dyne", ["Wasp"]],
  ["Kevin Masterson", ["Thunderstrike"]],
  ["Michael Pointer", ["Omega"]],
  ["Jason Macendale", ["Hobgoblin"]],
  ["Martinique Jason", ["Mastermind"]],
  ["Temper", ["Oya"]],
])

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
  .filter((character) => {
    const issueName =
      character.first_appeared_in_issue?.name?.toLocaleLowerCase() ?? ""
    const discardByIssueName = discardedFirstAppearanceIssueNameFragments.some(
      (fragment) =>
        fragment && issueName.includes(fragment.toLocaleLowerCase()),
    )

    return (
      !discardedCharacterNames.includes(character.name) &&
      !discardByIssueName &&
      Number(character.count_of_issue_appearances ?? 0) >= 10
    )
  })
  .map((character) => ({
    name: character.name ?? null,
    real_name: realNamePatches[character.name] ?? character.real_name ?? null,
    deck: character.deck ?? null,
    count_of_issue_appearances: Number(
      character.count_of_issue_appearances ?? 0,
    ),
    gender: mapGender(character.gender?.name ?? character.gender ?? null),
    ...(characterAliases.has(character.name)
      ? { aliases: characterAliases.get(character.name) }
      : {}),
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
