/**
 * WordPress dependencies
 */
import {
	activatePlugin,
	createNewPost,
	deactivatePlugin,
	insertBlock,
	searchForBlock,
	pressKeyWithModifier,
	openDocumentSettingsSidebar,
} from '@wordpress/e2e-test-utils';

describe( 'Block variations', () => {
	beforeAll( async () => {
		await activatePlugin( 'gutenberg-test-block-variations' );
	} );

	beforeEach( async () => {
		await createNewPost();
	} );

	afterAll( async () => {
		await deactivatePlugin( 'gutenberg-test-block-variations' );
	} );

	const expectInserterItem = async (
		blockName,
		blockTitle,
		variationName = null
	) => {
		const inserterItemSelector = [
			'.editor-block-list-item',
			blockName.replace( 'core/', '' ),
			variationName,
		]
			.filter( Boolean )
			.join( '-' );
		const inserterItem = await page.$( inserterItemSelector );
		expect( inserterItem ).toBeDefined();
		expect(
			await inserterItem.$x( `//span[text()="${ blockTitle }"]` )
		).toHaveLength( 1 );
	};

	test( 'Search for the overridden default Quote block', async () => {
		await searchForBlock( 'Quote' );

		expect( await page.$( '.editor-block-list-item-quote' ) ).toBeNull();
		expectInserterItem( 'quote', 'Large Quote', 'large' );
	} );

	test( 'Insert the overridden default Quote block variation', async () => {
		await insertBlock( 'Large Quote' );

		expect(
			await page.$(
				'.wp-block[data-type="core/quote"] blockquote.is-style-large'
			)
		).toBeDefined();
	} );

	test( 'Insert the Large Quote block variation with slash command', async () => {
		await insertBlock( 'Paragraph' );

		await page.keyboard.type( '/large' );
		await page.keyboard.press( 'Enter' );

		expect(
			await page.$(
				'.wp-block[data-type="core/quote"] blockquote.is-style-large'
			)
		).toBeDefined();
	} );

	test( 'Search for the Paragraph block with 2 additional variations', async () => {
		await searchForBlock( 'Paragraph' );

		expectInserterItem( 'core/paragraph', 'Paragraph' );
		expectInserterItem( 'core/paragraph', 'Success Message', 'success' );
		expectInserterItem( 'core/paragraph', 'Warning Message', 'warning' );
	} );

	test( 'Insert the Success Message block variation', async () => {
		await insertBlock( 'Success Message' );

		const successMessageBlock = await page.$(
			'.wp-block[data-type="core/paragraph"]'
		);
		expect( successMessageBlock ).toBeDefined();
		expect(
			await successMessageBlock.evaluate( ( node ) => node.innerText )
		).toBe( 'This is a success message!' );
	} );
	test( 'Pick the additional variation in the inserted Columns block', async () => {
		await insertBlock( 'Columns' );

		const fourColumnsVariation = await page.waitForSelector(
			'.wp-block[data-type="core/columns"] .block-editor-block-variation-picker__variation[aria-label="Four columns"]'
		);
		await fourColumnsVariation.click();
		expect(
			await page.$$(
				'.wp-block[data-type="core/columns"] .wp-block[data-type="core/column"]'
			)
		).toHaveLength( 4 );
	} );
	// @see @wordpres/block-editor/src/components/use-block-display-information (`useBlockDisplayInformation` hook).
	describe( 'testing block display information with matching variations', () => {
		const getActiveBreadcrumb = async () =>
			page.evaluate(
				() =>
					document.querySelector(
						'.block-editor-block-breadcrumb__current'
					).textContent
			);
		const getFirstNavigationItem = async () => {
			await pressKeyWithModifier( 'access', 'o' );
			// This also returns the visually hidden text `(selected block)`.
			// For example `Paragraph(selected block)`. In order to hide this
			// implementation detail and search for childNodes, we choose to
			// test with `String.prototype.startsWith()`.
			return page.evaluate(
				() =>
					document.querySelector(
						'.block-editor-block-navigation-block-select-button'
					).textContent
			);
		};
		const getBlockCardDescription = async () => {
			await openDocumentSettingsSidebar();
			return page.evaluate(
				() =>
					document.querySelector(
						'.block-editor-block-card__description'
					).textContent
			);
		};

		it( 'should show block information when no matching variation is found', async () => {
			await insertBlock( 'Large Quote' );
			const breadcrumb = await getActiveBreadcrumb();
			expect( breadcrumb ).toEqual( 'Quote' );
			const navigationItem = await getFirstNavigationItem();
			expect( navigationItem.startsWith( 'Quote' ) ).toBeTruthy();
			const description = await getBlockCardDescription();
			expect( description ).toEqual(
				'Give quoted text visual emphasis. "In quoting others, we cite ourselves." — Julio Cortázar'
			);
		} );
		it( 'should display variations info if all declared', async () => {
			await insertBlock( 'Success Message' );
			const breadcrumb = await getActiveBreadcrumb();
			expect( breadcrumb ).toEqual( 'Success Message' );
			const navigationItem = await getFirstNavigationItem();
			expect(
				navigationItem.startsWith( 'Success Message' )
			).toBeTruthy();
			const description = await getBlockCardDescription();
			expect( description ).toEqual(
				'This block displays a success message. This description overrides the default one provided for the Paragraph block.'
			);
		} );
		it( 'should display mixed block and variation match information', async () => {
			// Warning Message variation is missing the `description`.
			await insertBlock( 'Warning Message' );
			const breadcrumb = await getActiveBreadcrumb();
			expect( breadcrumb ).toEqual( 'Warning Message' );
			const navigationItem = await getFirstNavigationItem();
			expect(
				navigationItem.startsWith( 'Warning Message' )
			).toBeTruthy();
			const description = await getBlockCardDescription();
			expect( description ).toEqual(
				'Start with the building block of all narrative.'
			);
		} );
	} );
} );
