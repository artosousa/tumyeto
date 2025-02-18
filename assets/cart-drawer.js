class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  async fetchCartContents() {
    // Fetch the cart contents (this is a placeholder for your cart fetching method)
    const cart = await fetch('/cart.js') // Adjust the API call as needed for your platform
      .then(response => response.json())
      .catch(error => console.error('Error fetching cart:', error));
    
    return cart.items; // Assuming 'items' is the array of products in the cart
  }

  async addGripToCart() {
    const gripData = document.getElementById('js-cart-drawer-settings');
    const gripSettings = JSON.parse(gripData.innerHTML);
    let gripCount = 0;
    let deckCount = 0;

    const cartItems = await this.fetchCartContents();
    const countedDecks = new Set();
    cartItems.map((item) => {
        

        // Loop through each item properties
        for (const key in item.properties) {
            if (item.properties["Add Grip + $5.00"] === "Yes" || item.product_type === "Deck") {
              deckCount += item.quantity;
              countedDecks.add(item.id);
            }
        }

        // Check if product.handle is 'grip-single-sheet'
        if (item.handle === 'grip-single-sheet') {
            gripCount += item.quantity; // Increment gripCount by the item's quantity
        }
    });

    // If deckCount is greater than 0, add grip to the cart
    if (deckCount !== gripCount ) {
        this.addGripToCartItem(gripSettings.grip_id, deckCount - gripCount);
    }


  }
  // Function to add the grip item to the cart
  addGripToCartItem(gripId, quantity) {
    
    const gripItem = {
          id: gripId,
          quantity: quantity,
      };

      // Call the cart API or method to add this item to the cart
      this.addToCart(gripItem); // Assuming this.addToCart is a function that handles adding an item to the cart
  }
  addToCart(item) {
    const isLoading = document.querySelector('#isLoading')
    isLoading.classList.remove('hidden')
    

    fetch('/cart/add.js', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            items: [{
                id: item.id,
                quantity: item.quantity,
            }],
        }),
    })
    .then(response => response.json())
    .then(() => {
        return fetch('/cart.js'); // Fetch updated cart
    })
    .then(response => response.json())
    .then(cart => {
        

        // Update cart icon bubble
        const cartBubble = document.querySelector('#cart-icon-bubble');
        const cartCountBubble = cartBubble.querySelector('.cart-count-bubble');
        if (cartCountBubble) {
            cartCountBubble.textContent = cart.item_count; // Update item count
        }

        // Update cart drawer contents
        return fetch(`${routes.cart_url}?section_id=cart-drawer`);
    })
    .then(response => response.text())
    .then(responseText => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const selectors = ['cart-drawer-items', '.cart-drawer__footer'];
        for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
                targetElement.replaceWith(sourceElement);
            }
        }
        isLoading.classList.add('hidden')
    })
    .catch(error => {
        console.error('Error adding item to cart:', error);
        
    });
  }

  open(triggeredBy) {
    this.addGripToCart()
    
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
