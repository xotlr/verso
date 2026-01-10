import { Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { screenplaySchema } from '../schema';

export const minimumStructurePluginKey = new PluginKey('minimumStructure');

// Note: modifiesDraftField function removed - filterTransaction that used it is disabled
// See commented filterTransaction in createMinimumStructurePlugin for reference

/**
 * Plugin that ensures the document maintains minimum required structure:
 * - Title page with all 6 fields (title, author, logline, contact, copyright, draft)
 * - At least one content block after the title page (scene_heading or action)
 *
 * If the user deletes these elements, they are automatically restored as empty
 * nodes with CSS placeholder text (ghost placeholders).
 *
 * Also prevents direct user edits to the draft field (it's auto-generated from save date).
 */
export function createMinimumStructurePlugin() {
  return new Plugin({
    key: minimumStructurePluginKey,

    // NOTE: filterTransaction temporarily disabled to debug pagination issue
    // filterTransaction(tr, state) {
    //   // Block user edits to the draft field
    //   if (tr.docChanged && modifiesDraftField(tr, state.doc)) {
    //     return false;
    //   }
    //   return true;
    // },

    appendTransaction(
      transactions: readonly Transaction[],
      oldState,
      newState
    ): Transaction | null {
      // Only check if document actually changed
      const docChanged = transactions.some((tr) => tr.docChanged);
      if (!docChanged) return null;

      const doc = newState.doc;
      let tr: Transaction | null = null;

      // Check for title page
      const firstChild = doc.firstChild;
      const hasTitlePage = firstChild?.type.name === 'title_page';

      if (!hasTitlePage) {
        // Title page was deleted - restore it
        tr = tr || newState.tr;
        const titlePage = createEmptyTitlePage();
        tr.insert(0, titlePage);
      } else {
        // Title page exists - check it has all 6 fields
        const titlePage = firstChild!;
        const requiredFields = [
          'title_page_title',
          'title_page_author',
          'title_page_logline',
          'title_page_contact',
          'title_page_copyright',
          'title_page_draft',
        ];

        const existingFields = new Set<string>();
        titlePage.forEach((child) => {
          existingFields.add(child.type.name);
        });

        // Check if any fields are missing
        const missingFields = requiredFields.filter(
          (field) => !existingFields.has(field)
        );

        if (missingFields.length > 0) {
          tr = tr || newState.tr;

          // Find the position inside title_page to insert missing fields
          // Insert at the end of title_page content
          const titlePageEnd = 1 + titlePage.content.size; // 1 for title_page start pos

          // Insert missing fields in reverse order (so they end up in correct order)
          for (const fieldName of [...missingFields].reverse()) {
            const nodeType = screenplaySchema.nodes[fieldName];
            if (nodeType) {
              const emptyField = nodeType.create();
              tr.insert(titlePageEnd, emptyField);
            }
          }
        }
      }

      // Check for at least one content block after title page
      const contentStartIndex = hasTitlePage ? 1 : 0;
      const hasContentBlock = doc.childCount > contentStartIndex;

      if (!hasContentBlock) {
        // No content block - add empty action as starter
        tr = tr || newState.tr;
        const insertPos = tr.doc.content.size;
        const action = screenplaySchema.nodes.action.create();
        tr.insert(insertPos, action);
      }

      return tr;
    },
  });
}

/**
 * Create an empty title page with all 6 fields.
 */
function createEmptyTitlePage(): ProseMirrorNode {
  const titlePageType = screenplaySchema.nodes.title_page;

  const fields = [
    screenplaySchema.nodes.title_page_title.create(),
    screenplaySchema.nodes.title_page_author.create(),
    screenplaySchema.nodes.title_page_logline.create(),
    screenplaySchema.nodes.title_page_contact.create(),
    screenplaySchema.nodes.title_page_copyright.create(),
    screenplaySchema.nodes.title_page_draft.create(),
  ];

  return titlePageType.create(null, fields);
}

/**
 * Format a date for display in the draft field.
 * Returns format like "January 2024" or "March 15, 2024"
 */
function formatDraftDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Update the draft field content programmatically.
 * This bypasses the filterTransaction that blocks user edits.
 *
 * @param view - The ProseMirror EditorView
 * @param draftLabel - The draft label (e.g., "First Draft", "Second Draft")
 * @param date - The date to display (defaults to now)
 */
export function updateDraftField(
  view: { state: { doc: ProseMirrorNode; tr: Transaction }; dispatch: (tr: Transaction) => void },
  draftLabel: string = 'Draft',
  date: Date = new Date()
): void {
  const { doc, tr } = view.state;

  // Find the title page and draft field
  const titlePage = doc.firstChild;
  if (!titlePage || titlePage.type.name !== 'title_page') {
    return;
  }

  let draftPos = -1;
  let draftEnd = -1;
  let pos = 1; // Start after title_page opening

  titlePage.forEach((child) => {
    if (child.type.name === 'title_page_draft') {
      draftPos = pos;
      draftEnd = pos + child.nodeSize;
    }
    pos += child.nodeSize;
  });

  if (draftPos === -1) return;

  // Create the draft text content
  const formattedDate = formatDraftDate(date);
  const draftText = `${draftLabel}\n${formattedDate}`;

  // Replace the draft field content
  const draftNodeType = screenplaySchema.nodes.title_page_draft;
  const newDraftNode = draftNodeType.create(
    null,
    draftText ? screenplaySchema.text(draftText) : undefined
  );

  // Use replaceWith and mark as programmatic update
  const transaction = tr
    .replaceWith(draftPos, draftEnd, newDraftNode)
    .setMeta('draftUpdate', true)
    .setMeta('addToHistory', false); // Don't add to undo history

  view.dispatch(transaction);
}
