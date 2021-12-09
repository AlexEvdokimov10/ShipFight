;(function() {

	let startGame = false;
	let checkHandlerPlacement = false;
	let checkHandlerController = false;
	let compShot = false;


	const getElement = id => document.getElementById(id);

	const getCoordinates = el => {
		const coords = el.getBoundingClientRect();

		return {
			left: coords.left + window.pageXOffset,
			right: coords.right + window.pageXOffset,
			top: coords.top + window.pageYOffset,
			bottom: coords.bottom + window.pageYOffset
		};
	};


	const humanField = getElement('field_human');

	const computerField = getElement('field_computer');

	class Field {

		static FIELD_SIDE = 330;

		static SHIP_SIDE = 33;

		static SHIP_DATA = {
			fourdeck: [1, 4],
			tripledeck: [2, 3],
			doubledeck: [3, 2],
			singledeck: [4, 1]
		};

		constructor(field) {

			this.field = field;

			this.squadron = {};

			this.matrix = [];

			let { left, right, top, bottom } = getCoordinates(this.field);
			this.fieldLeft = left;
			this.fieldRight = right;
			this.fieldTop = top;
			this.fieldBottom = bottom;
		}

		static createMatrix() {
			return [...Array(10)].map(() => Array(10).fill(0));
		}

		static getRandom = n => Math.floor(Math.random() * (n + 1));

		clearField() {
			while (this.field.firstChild) {
				this.field.removeChild(this.field.firstChild);
			}
			this.squadron = {};
			this.matrix = Field.createMatrix();
		}

		randomLocationShips() {
			for (let type in Field.SHIP_DATA) {

				let count = Field.SHIP_DATA[type][0];

				let decks = Field.SHIP_DATA[type][1];

				for (let i = 0; i < count; i++) {

					let options = this.getCoordsDecks(decks);

					options.decks = decks;

					options.shipname = type + String(i + 1);

					const ship = new Ships(this, options);
					ship.createShip();
				}
			}
		}

		getCoordsDecks(decks) {

			let xVertical = Field.getRandom(1), yVertical = (xVertical == 0) ? 1 : 0;
			let	x, y;


			if (xVertical == 0) {
				x = Field.getRandom(9);
				y = Field.getRandom(10 - decks);
			} else {
				x = Field.getRandom(10 - decks); y = Field.getRandom(9);
			}

			const obj = {
				x, y,
				kx:xVertical,
				ky:yVertical}

			const result = this.checkLocationShip(obj, decks);

			if (!result) return this.getCoordsDecks(decks);
			return obj;
		}

		checkLocationShip(obj, decks) {
			let {
				x,
				y,
				kx,
				ky,
				fromX,
				toX,
				fromY,
				toY } = obj;


			fromX = (x == 0) ? x : x - 1;
			if (x + kx * decks == 10 && kx == 1){
				toX = x + kx * decks;
			}
			else if (x + x * decks < 10 && kx == 1){
				toX = x + kx * decks + 1;
			}
			else if (x == 9 && kx == 0) {
				toX = x + 1;
			}
			else if (x < 9 && kx == 0) {
				toX = x + 2;
			}
			fromY = (y == 0) ? y : y - 1;
			if (y + ky * decks == 10 && ky == 1)
			{
			toY = y + ky * decks;
			}
			else if (y + ky * decks < 10 && ky == 1){
				toY = y + ky * decks + 1;
			}
			else if (y == 9 && ky == 0) {
				toY = y + 1;
			}
			else if (y < 9 && ky == 0) {
				toY = y + 2;
			}

			if (toX === undefined || toY === undefined){
				return false;
			}
			if (this.matrix.slice(fromX, toX)
				.filter(arr => arr.slice(fromY, toY).includes(1))
				.length > 0){
				return false
			}
			return true;
		}
	}



	class Ships {
		constructor(self, { x, y, kx, ky, decks, shipname }) {

			this.player = (self === human) ? human : computer;
			this.field = self.field;
			this.shipname = shipname;
			this.decks = decks;
			this.x = x;
			this.y = y;
			this.kx = kx;
			this.ky = ky;
			this.hits = 0;
			this.arrDecks = [];
		}

		static showShip(self, shipName, x, y, kx) {

			const div = document.createElement('div');

			const classname = shipName.slice(0, -1);

			const dir = (kx == 1) ? ' vertical' : '';
			div.setAttribute('id', shipName);
			div.className = `ship ${classname}${dir}`;
			div.style.cssText = `left:${y * Field.SHIP_SIDE}px; top:${x * Field.SHIP_SIDE}px;`;
			self.field.appendChild(div);
		}

		createShip() {
			let { player, field, shipname, decks, x, y, kx, ky, hits, arrDecks, k = 0 } = this;

			while (k < decks) {

				let i = x + k * kx
				let j = y + k * ky;
				player.matrix[i][j] = 1;
				arrDecks.push([i, j]);
				k++;
			}


			player.squadron[shipname] = {arrDecks, hits, x, y, kx, ky};

			if (player === human) {
				Ships.showShip(human, shipname, x, y, kx);
				if (Object.keys(player.squadron).length == 10) {
					buttonPlay.hidden = false;
				}
			}
		}
	}



	class Placement {

		static FRAME_COORDS = getCoordinates(humanField);
		
		constructor() {

			this.dragObject = {};

			this.pressed = false;
		}

		static getShipName = elementShip => elementShip.getAttribute('id');
		static getCloneDecks = elementShip => {
			const type = Placement.getShipName(elementShip).slice(0, -1);
			return Field.SHIP_DATA[type][1];
		}

		setObserver() {
			if (checkHandlerPlacement) {
				return;
			}
			document.addEventListener('mousedown', this.onMouseDown.bind(this));
			document.addEventListener('mousemove', this.onMouseMove.bind(this));
			document.addEventListener('mouseup', this.onMouseUp.bind(this));
			humanField.addEventListener('contextmenu', this.rotationShip.bind(this));
			checkHandlerPlacement = true;
		}

		onMouseDown(tempPlacement) {

			if (tempPlacement.which != 1 || startGame) return;


			const pressElement = tempPlacement.target.closest('.ship');
			if(!pressElement) return;

			this.pressed = true;


			this.dragObject = {
				el: pressElement,
				parent: pressElement.parentElement,
				next: pressElement.nextElementSibling,
				downX: tempPlacement.pageX,
				downY: tempPlacement.pageY,
				left: pressElement.offsetLeft,
				top: pressElement.offsetTop,
				kx: 0,
				ky: 1
			};
			if (pressElement.parentElement === humanField) {
				const name = Placement.getShipName(pressElement);
				this.dragObject.kx = human.squadron[name].kx;
				this.dragObject.ky = human.squadron[name].ky;
			}
		}

		onMouseMove(tempPlacement) {
			if (!this.pressed || !this.dragObject.el) {
				return;
			}


			let { left, right, top, bottom } = getCoordinates(this.dragObject.el);


			if (!this.clone) {

				this.decks = Placement.getCloneDecks(this.dragObject.el);

				this.clone = this.creatClone({left, right, top, bottom}) || null;
				if (!this.clone) return;
				this.shiftX = this.dragObject.downX - left;
				this.shiftY = this.dragObject.downY - top;
				this.clone.style.zIndex = '1000';
				document.body.appendChild(this.clone);
				this.removeShipFromSquadron(this.clone);
			}
			let currentLeft = Math.round(tempPlacement.pageX - this.shiftX),
				currentTop = Math.round(tempPlacement.pageY - this.shiftY);
			this.clone.style.left = `${currentLeft}px`;
			this.clone.style.top = `${currentTop}px`;


			if (left >= Placement.FRAME_COORDS.left - 14 && right <= Placement.FRAME_COORDS.right + 14 && top >= Placement.FRAME_COORDS.top - 14 && bottom <= Placement.FRAME_COORDS.bottom + 14) {
				this.clone.classList.remove('unsuccess');
				this.clone.classList.add('success');

				const { x, y } = this.getCoordsCloneInMatrix({ left, right, top, bottom });
				const obj = {
					x,
					y,
					kx: this.dragObject.kx,
					ky: this.dragObject.ky
				};

				const result = human.checkLocationShip(obj, this.decks);
				if (!result) {

					this.clone.classList.remove('success');
					this.clone.classList.add('unsuccess');
				}
			} else {
				this.clone.classList.remove('success');
				this.clone.classList.add('unsuccess');
			}
		}

		onMouseUp(e) {
			this.pressed = false;

			if (!this.clone){
				return;
			}
			if (this.clone.classList.contains('unsuccess')) {
				this.clone.classList.remove('unsuccess');
				this.clone.rollback();
			} else {

				this.createShipAfterMoving();
			}
			this.removeClone();
		}

		rotationShip(tempElement) {

			tempElement.preventDefault();
			if (tempElement.which != 3 || startGame){
				return;
			}

			const element = tempElement.target.closest('.ship');
			const name = Placement.getShipName(element);

			if (human.squadron[name].decks == 1) {
				return;
			}

			const obj = {
				kx: (human.squadron[name].kx == 0) ? 1 : 0,
				ky: (human.squadron[name].ky == 0) ? 1 : 0,
				x: human.squadron[name].x,
				y: human.squadron[name].y
			};

			const decks = human.squadron[name].arrDecks.length;
			this.removeShipFromSquadron(element);
			human.field.removeChild(element);


			const result = human.checkLocationShip(obj, decks);
			if(!result) {
				obj.kx = (obj.kx == 0) ? 1 : 0;
				obj.ky = (obj.ky == 0) ? 1 : 0;
			}

			obj.shipname = name;
			obj.decks = decks;
			const ship = new Ships(human, obj);
			ship.createShip();

			if (!result) {
				const el = getElement(name);
				el.classList.add('unsuccess');
				setTimeout(() => { el.classList.remove('unsuccess') }, 750);
			}
		}

		creatClone() {
			const clone = this.dragObject.el;
			const oldPosition = this.dragObject;

			clone.rollback = () => {
				if (oldPosition.parent == humanField) {
					clone.style.left = `${oldPosition.left}px`;
					clone.style.top = `${oldPosition.top}px`;
					clone.style.zIndex = '';
					oldPosition.parent.insertBefore(clone, oldPosition.next);
					this.createShipAfterMoving();
				} else {
					// возвращаем корабль в контейнер 'shipsCollection'
					clone.removeAttribute('style');
					oldPosition.parent.insertBefore(clone, oldPosition.next);
				}
			};
			return clone;
		}

		removeClone() {
			delete this.clone;
			this.dragObject = {};
		}

		createShipAfterMoving() {

			const coords = getCoordinates(this.clone);
			let { left, top, x, y } = this.getCoordsCloneInMatrix(coords);
			this.clone.style.left = `${left}px`;
			this.clone.style.top = `${top}px`;

			humanField.appendChild(this.clone);
			this.clone.classList.remove('success');


			const options = {
				shipname: Placement.getShipName(this.clone),
				x,
				y,
				kx: this.dragObject.kx,
				ky: this.dragObject.ky,
				decks: this.decks
			};


			const ship = new Ships(human, options);
			ship.createShip();
			humanField.removeChild(this.clone);
		}

		getCoordsCloneInMatrix({left, right, top, bottom} = coords) {

			let computedLeft = left - Placement.FRAME_COORDS.left,
				computedRight = right - Placement.FRAME_COORDS.left,
				computedTop = top - Placement.FRAME_COORDS.top,
				computedBottom = bottom - Placement.FRAME_COORDS.top;


			const obj = {};

			let ftop = (computedTop < 0) ? 0 : (computedBottom > Field.FIELD_SIDE) ? Field.FIELD_SIDE - Field.SHIP_SIDE : computedTop;
			let fleft = (computedLeft < 0) ? 0 : (computedRight > Field.FIELD_SIDE) ? Field.FIELD_SIDE - Field.SHIP_SIDE * this.decks : computedLeft;

			obj.top = Math.round(ftop / Field.SHIP_SIDE) * Field.SHIP_SIDE;
			obj.left = Math.round(fleft / Field.SHIP_SIDE) * Field.SHIP_SIDE;
			// переводим значение в координатах матрицы
			obj.x = obj.top / Field.SHIP_SIDE;
			obj.y = obj.left / Field.SHIP_SIDE;

			return obj;
		}

		removeShipFromSquadron(el) {
			const name = Placement.getShipName(el);

			if (!human.squadron[name]) {
				return;
			}


			const arr = human.squadron[name].arrDecks;
			for (let coords of arr) {
				const [x, y] = coords;
				human.matrix[x][y] = 0;
			}

			delete human.squadron[name];
		}
	}



})();
