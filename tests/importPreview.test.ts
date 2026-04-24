import { describe, expect, it } from 'vitest';
import { previewImportState } from '../src/shared/storage/chromeStorage';
import { createProblem, createState } from './helpers/stateFactory';

describe('previewImportState', () => {
  it('reports import counts and overwrite summary before import', () => {
    const currentProblem = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      updatedAt: '2026-04-20T10:00:00.000Z'
    });
    const currentState = createState({
      problemsById: {
        [currentProblem.id]: currentProblem
      }
    });

    const preview = previewImportState(currentState, {
      version: 1,
      problemsById: {
        legacy_1: {
          ...currentProblem,
          id: 'legacy_1',
          updatedAt: '2026-04-21T10:00:00.000Z'
        },
        legacy_2: {
          ...createProblem({
            id: 'legacy_2',
            titleSlug: 'add-two-numbers',
            title: 'Add Two Numbers',
            url: 'https://leetcode.com/problems/add-two-numbers/'
          })
        }
      },
      notesByProblemId: {
        legacy_2: {
          problemId: 'legacy_2',
          markdown: 'new note',
          createdAt: '2026-04-21T10:00:00.000Z',
          updatedAt: '2026-04-21T10:00:00.000Z'
        }
      },
      reviewLogsById: {}
    });

    expect(preview.valid).toBe(true);
    expect(preview.problemCount).toBe(2);
    expect(preview.newProblemCount).toBe(1);
    expect(preview.overwrittenProblemCount).toBe(1);
    expect(preview.noteCount).toBe(1);
    expect(preview.errorMessages).toEqual([]);
  });

  it('returns errors for invalid input and warnings for missing sections', () => {
    expect(previewImportState(createState(), null)).toMatchObject({
      valid: false,
      errorMessages: ['Invalid backup file. Expected a JSON object.']
    });

    const preview = previewImportState(createState(), { version: 1 });
    expect(preview.valid).toBe(true);
    expect(preview.warningMessages).toEqual(
      expect.arrayContaining([
        'Backup does not contain problemsById; no problems will be imported.',
        'Backup does not contain notesByProblemId; no notes will be imported.',
        'Backup does not contain reviewLogsById; no review logs will be imported.'
      ])
    );
  });
});
