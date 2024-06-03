/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { autorunHandleChanges } from 'vs/base/common/observable';
import { ensureNoDisposablesAreLeakedInTestSuite } from 'vs/base/test/common/utils';
import { obsCodeEditor } from 'vs/editor/browser/observableUtilities';
import { Position } from 'vs/editor/common/core/position';
import { withTestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';

suite('CodeEditorWidget', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	test('test1', () => withTestCodeEditor('hello world', {}, (editor, viewModel) => {
		const disposables = new DisposableStore();

		const obsEditor = obsCodeEditor(editor);

		const log = new Log();

		disposables.add(autorunHandleChanges({
			createEmptyChangeSummary: () => undefined,
			handleChange: (context, changeSummary) => {
				if (context.didChange(obsEditor.selections)) {
					log.log('handle selection change, source: ' + context.change?.source);
				} else {
					log.log(`handle change ${context.changedObservable.toString()} ${context.change}`);
				}
				return true;
			},
		}, reader => {
			const selection = obsEditor.selections.read(reader)?.map(s => s.toString()).join(', ');
			const versionId = obsEditor.versionId.read(reader);
			obsEditor.onDidType.read(reader);

			log.log(`selection: ${selection}, value: ${versionId}`);
		}));

		assert.deepStrictEqual(log.getAndClearEntries(), (["selection: [1,1 -> 1,1], value: 1"]));

		editor.setPosition(new Position(1, 2));

		assert.deepStrictEqual(log.getAndClearEntries(), ([
			"handle selection change, source: api",
			"selection: [1,2 -> 1,2], value: 1"
		]));

		editor.trigger('keyboard', 'type', { text: 'abc' });

		assert.deepStrictEqual(log.getAndClearEntries(), [
			"handle change ObservableCodeEditor._versionId: 4 [object Object]",
			"handle selection change, source: undefined",
			"handle change ObservableCodeEditor._versionId: 4 [object Object]",
			"handle change ObservableCodeEditor._versionId: 4 [object Object]",
			"handle selection change, source: keyboard",
			"handle change ObservableCodeEditor.onDidType abc",
			"selection: [1,5 -> 1,5], value: 4",
		]);

		disposables.dispose();
	}));
});

class Log {
	private readonly entries: string[] = [];
	public log(message: string): void {
		this.entries.push(message);
	}

	public getAndClearEntries(): string[] {
		const entries = [...this.entries];
		this.entries.length = 0;
		return entries;
	}
}
