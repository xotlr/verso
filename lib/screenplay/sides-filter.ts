/**
 * Filter utilities for digital sides.
 * Filters ProseMirror document content by character or scenes.
 */

interface PMNode {
  type: string
  content?: PMNode[]
  attrs?: Record<string, unknown>
  text?: string
}

interface PMDoc {
  type: string
  content: PMNode[]
}

/**
 * Get normalized character name from node (removes parentheticals like "(V.O.)")
 */
function getCharacterName(node: PMNode): string {
  if (node.type !== "character") return ""

  // Get text content
  let text = ""
  if (node.text) {
    text = node.text
  } else if (node.content) {
    text = node.content
      .filter((n) => n.text)
      .map((n) => n.text)
      .join("")
  }

  // Remove parentheticals and normalize
  return text.replace(/\s*\([^)]+\)\s*$/g, "").trim().toUpperCase()
}

/**
 * Check if a node is a scene heading
 */
function isSceneHeading(node: PMNode): boolean {
  return node.type === "scene_heading"
}

/**
 * Get scene ID from a scene heading node
 */
function getSceneId(node: PMNode, index: number): string {
  if (node.attrs?.id) return String(node.attrs.id)

  // Generate deterministic ID similar to document-extractors.ts
  let textContent = ""
  if (node.text) {
    textContent = node.text
  } else if (node.content) {
    textContent = node.content
      .filter((n) => n.text)
      .map((n) => n.text)
      .join("")
  }

  const contentHash = textContent
    .slice(0, 20)
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()

  return `scene-${index}-${contentHash || "empty"}`
}

/**
 * Filter document content to show only scenes containing a specific character,
 * including their dialogue and the action/context around them.
 */
export function filterByCharacter(doc: unknown, characterName: string): object {
  const document = doc as PMDoc
  if (!document?.content) return doc as object

  const normalizedTarget = characterName.toUpperCase().trim()
  const result: PMNode[] = []

  let currentSceneNodes: PMNode[] = []
  let currentSceneHasCharacter = false
  let sceneHeading: PMNode | null = null

  for (const node of document.content) {
    if (isSceneHeading(node)) {
      // Flush previous scene if it had the character
      if (currentSceneHasCharacter && sceneHeading) {
        result.push(sceneHeading)
        result.push(...currentSceneNodes)
      }

      // Start new scene
      sceneHeading = node
      currentSceneNodes = []
      currentSceneHasCharacter = false
    } else {
      // Check if this node contains the target character
      if (node.type === "character") {
        const name = getCharacterName(node)
        if (name === normalizedTarget) {
          currentSceneHasCharacter = true
        }
      }

      // Keep track of nodes in this scene
      currentSceneNodes.push(node)
    }
  }

  // Flush last scene
  if (currentSceneHasCharacter && sceneHeading) {
    result.push(sceneHeading)
    result.push(...currentSceneNodes)
  }

  return {
    ...document,
    content: result,
  }
}

/**
 * Filter document content to include only specified scenes.
 * Scene IDs can be deterministic IDs or scene numbers.
 */
export function filterByScenes(doc: unknown, sceneIds: string[]): object {
  const document = doc as PMDoc
  if (!document?.content) return doc as object

  // Normalize scene IDs for comparison
  const targetIds = new Set(sceneIds.map((id) => id.toLowerCase().trim()))

  const result: PMNode[] = []
  let currentSceneId: string | null = null
  let sceneIndex = 0
  let includeCurrentScene = false

  for (const node of document.content) {
    if (isSceneHeading(node)) {
      sceneIndex++
      currentSceneId = getSceneId(node, sceneIndex)

      // Check if this scene should be included
      // Match by ID, scene number, or index
      const sceneNumber = node.attrs?.sceneNumber
        ? String(node.attrs.sceneNumber).toLowerCase()
        : null

      includeCurrentScene =
        targetIds.has(currentSceneId.toLowerCase()) ||
        (sceneNumber && targetIds.has(sceneNumber)) ||
        targetIds.has(String(sceneIndex))

      if (includeCurrentScene) {
        result.push(node)
      }
    } else if (includeCurrentScene) {
      result.push(node)
    }
  }

  return {
    ...document,
    content: result,
  }
}

/**
 * Extract list of characters appearing in a document.
 * Returns sorted by dialogue count (most dialogue first).
 */
export function extractCharactersFromJson(doc: unknown): Array<{ name: string; dialogueCount: number }> {
  const document = doc as PMDoc
  if (!document?.content) return []

  const characterMap = new Map<string, number>()

  function walkNodes(nodes: PMNode[]) {
    for (const node of nodes) {
      if (node.type === "character") {
        const name = getCharacterName(node)
        if (name) {
          characterMap.set(name, (characterMap.get(name) || 0) + 1)
        }
      }
      if (node.content) {
        walkNodes(node.content)
      }
    }
  }

  walkNodes(document.content)

  return Array.from(characterMap.entries())
    .map(([name, count]) => ({ name, dialogueCount: count }))
    .sort((a, b) => b.dialogueCount - a.dialogueCount)
}

/**
 * Extract list of scenes from a document.
 * Returns scene info for filtering UI.
 */
export function extractScenesFromJson(doc: unknown): Array<{ id: string; heading: string; number?: string }> {
  const document = doc as PMDoc
  if (!document?.content) return []

  const scenes: Array<{ id: string; heading: string; number?: string }> = []
  let sceneIndex = 0

  for (const node of document.content) {
    if (isSceneHeading(node)) {
      sceneIndex++

      // Get text content
      let heading = ""
      if (node.text) {
        heading = node.text
      } else if (node.content) {
        heading = node.content
          .filter((n) => n.text)
          .map((n) => n.text)
          .join("")
      }

      scenes.push({
        id: getSceneId(node, sceneIndex),
        heading: heading || `Scene ${sceneIndex}`,
        number: node.attrs?.sceneNumber ? String(node.attrs.sceneNumber) : undefined,
      })
    }
  }

  return scenes
}
