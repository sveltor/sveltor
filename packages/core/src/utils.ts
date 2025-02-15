import {
	DOMSerializer,
	type Fragment,
	type Schema,
	Node,
} from "@tiptap/pm/model";

import {
	type Node as TiptapNode,
	type Editor,
	isNodeSelection,
} from "@tiptap/core";
import { createHTMLDocument, VHTMLDocument } from "zeed-dom";

export function createUUID(): string {
	return crypto.randomUUID();
}

export type Transformer = (virtualeElement: VHTMLDocument) => Promise<string>;
export const transformHTML = async (
	fragment: Fragment,
	schema: Schema,
	transformer?: Transformer,
) => {
	const domSerializer = DOMSerializer.fromSchema(schema);
	const dom = domSerializer.serializeFragment(fragment, {
		document: createHTMLDocument() as unknown as Document,
	}) as unknown as VHTMLDocument;

	const blocks = dom.children.map(async (child) => {
		if (transformer) {
			return transformer(child);
		}
		return child.render();
	});
	const results = await Promise.all(blocks);
	return results.join("");
};

export const renderHTML = async (editor: Editor, transformer?: Transformer) => {
	const doc = editor.getJSON();
	try {
		const schema = editor.schema;
		const contentNode = Node.fromJSON(schema, doc);
		return transformHTML(contentNode.content, schema, transformer);
	} catch (error) {
		console.error(error);
		return ``;
	}
};

export const nodeIdDecorator = (plugin: TiptapNode) => {
	if (!plugin.parent) return;
	const addAttributes = (plugin as any).parent?.config?.addAttributes;

	(plugin as any).parent.config.addAttributes = function () {
		const attrs = addAttributes?.apply(this, arguments) || {};
		return {
			...attrs,
			align: {
				default: "left",
				renderHTML: (attributes) => {
					return {
						"data-align": attributes.align,
						"data-node-type": this.name,
						style: `text-align:${attributes.align}`,
					};
				},
				parseHTML: (element: string | HTMLElement) => {
					if (typeof element === "string") return;
					return element.getAttribute("data-align");
				},
			},
		};
	};

	return plugin;
};
export const extractTOC = (root: HTMLElement) => {
	root.childNodes.forEach((child) => {});
};

export const getRootNode = (editor: Editor) => {
	const { doc, selection } = editor.state;
	if (isNodeSelection(selection)) {
		const node = selection.node;
		return {
			start: selection.from,
			end: selection.to,
			node,
		};
	}
	if (selection.anchor > 0) {
		const resolver = doc.resolve(selection.anchor);
		return {
			start: resolver.start(1),
			node: resolver.node(1),
			end: resolver.end(1),
		};
	}
	return null;
};
