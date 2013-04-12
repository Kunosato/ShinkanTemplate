/// <reference path="index.html" />
/// <reference path="map.js" />
/// <reference path="libraries/enchant.js" />
window.onload = function () {
	var gameScore = 0;
	var Rectangle = enchant.Class.create({
		initialize: function (x, y, width, height) {
			this.x = x;
			this.y = y;
			this.width = width;
			this.height = height;
		},
		right: {
			get: function () {
				return this.x + this.width;
			}
		},
		bottom: {
			get: function () {
				return this.y + this.height;
			}
		}
	});

	var game = new Game(320, 320);
	game.fps = 24;

	for (var spritePath in Path.Sprite) {
		game.preload(Path.Sprite[spritePath]);
	}
	for (var audioPath in Path.Audio) {
		game.preload(Path.Audio[audioPath]);
	}
	game.onload = function () {

		var map = Mapset(game);

		/********************
		*  Character Class
		********************/
		Character = enchant.Class.create(Sprite, {
			initialize: function (x, y) {
				enchant.Sprite.call(this, 32, 32);
				this.x = x * 16;
				this.y = y * 16;
				this.vx = 0;
				this.vy = 0;
				this.alive = true;
				this.count = 0;
				this.image = game.assets[Path.Sprite.chara1];
			}
		});


		/********************
		*  Bear Class
		********************/
		Bear = Class.create(Character, {
			initialize: function (x, y) {
				Character.call(this, x, y);
				this.jumping = true;
				this.jumpBoost = 0;
			},
			setMoveDirection: function () {
				if (game.input.left) {
					this.vx = -5;
					this.scaleX = -1;
				} else if (game.input.right) {
					this.vx = 5;
					this.scaleX = 1;
				} else {
					this.vx = 0;
				}

				if (this.vx != 0) {
					if (game.frame % 3 == 0) {
						this.frame %= 2;
						++this.frame;
					}
				} else {
					this.frame = 0;
				}
			},
			move: function () {
				this.jumping  = true;
				this.vy += 1;
				this.vx = Math.min(Math.max(this.vx, -10), 10);
				this.vy = Math.min(Math.max(this.vy, -10), 10);
				var dest = new Rectangle(
					this.x + this.vx + 5, this.y + this.vy + 2,
					this.width - 16, this.height - 2
				);
				if (dest.x < -stage.x) {
					dest.x = -stage.x;
					this.vx = 0;
				}
				while (true) {
					var boundary, crossing;
					var dx = dest.x - this.x - 5;
					var dy = dest.y - this.y - 2;
					// enum Direction もどき
					var Direction = function () {
					}
					Direction.upward = 0;
					Direction.right = 1;
					Direction.downward = 2;
					Direction.left = 3;
					//right collision
					if (dx > 0 && Math.floor(dest.right / 16) != Math.floor((dest.right - dx) / 16)) {
						boundary = Math.floor(dest.right / 16) * 16;
						crossing = (dest.right - boundary) / dx * dy + dest.y;
						if (collision(Direction.right)) {
							this.vx = 0;
							dest.x = boundary - dest.width - 0.01;
							continue;
						}
						//left collision
					} else if (dx < 0 && Math.floor(dest.x / 16) != Math.floor((dest.x - dx) / 16)) {
						boundary = Math.floor(dest.x / 16) * 16 + 16;
						crossing = (boundary - dest.x) / dx * dy + dest.y;
						if (collision(Direction.left)) {
							this.vx = 0;
							dest.x = boundary + 0.01;
							continue;
						}
					}
					//downward collision
					if (dy > 0 && Math.floor(dest.bottom / 16) != Math.floor((dest.bottom - dy) / 16)) {
						boundary = Math.floor(dest.bottom / 16) * 16;
						crossing = (dest.bottom - boundary) / dy * dx + dest.x;
						if (collision(Direction.downward)) {
							this.jumping = false;
							this.vy = 0;
							dest.y = boundary - dest.height - 0.01;

							if (map.checkTile(crossing, boundary) == 17 || map.checkTile(crossing + dest.width, boundary) == 17) {
								this.alive = false;
							}
							continue;
						}
						//upward collision
					} else if (dy < 0 && Math.floor(dest.y / 16) != Math.floor((dest.y - dy) / 16)) {
						boundary = Math.floor(dest.y / 16) * 16 + 16;
						crossing = (boundary - dest.y) / dy * dx + dest.x;
						if (collision(Direction.upward)) {
							this.vy = 0;
							dest.y = boundary + 0.01;
							continue;
						}
					}

					break;
				}
				this.x = dest.x - 5;
				this.y = dest.y - 2;

				function collision(direction) {
					var flags = new Array();

					switch (direction) {
						case Direction.right:
							for (i = 0; i < dest.height; ++i) {
								if ((map.hitTest(boundary, crossing + i) && !map.hitTest(boundary - 16, crossing + i))) {
									flags.push(true);
								}
							}
							if (flags.indexOf(true) != -1)
								return true;
							else
								return false;
						case Direction.left:
							if ((map.hitTest(boundary - 16, crossing + i) && !map.hitTest(boundary, crossing + i))) {
								flags.push(true);
							}
							if (flags.indexOf(true) != -1)
								return true;
							else
								return false;
						case Direction.downward:
							if ((map.hitTest(crossing, boundary) && !map.hitTest(crossing, boundary - 16)) ||
								(map.hitTest(crossing + dest.width, boundary) && !map.hitTest(crossing + dest.width, boundary - 16))) {
								return true;
								break;
							}
						case Direction.upward:
							if ((map.hitTest(crossing, boundary - 16) && !map.hitTest(crossing, boundary)) ||
								(map.hitTest(crossing + dest.width, boundary - 16) && !map.hitTest(crossing + dest.width, boundary))) {
								return true;
							}
							break;
						default:
							return false;
					}
				}
			},
			jump: function () {
				if (game.input.up) {
					if (!this.jumping) {
						this.jumpBoost = 5;
						game.assets[Path.Audio.jump].play();
					}
					this.vy -= this.jumpBoost > 0 ? --this.jumpBoost : 0;
				} else {
					this.jumpBoost = 0;
				}
			},
			dead: function () {
				game.assets[Path.Audio.gameover].play();
				this.frame = 3;
				this.vy = -3;
				this.y += this.vy;
				if (++this.count > 10) {
					this.dying();
				}
			},
			dying: function () {
				var score = Math.round(bear.x);
				this.addEventListener('enterframe', function () {
					this.vy += 1;
					this.y += this.vy;
					if (this.y > 320) {
						game.end('ヤラレチャッタ');
					}
				});
				this.removeEventListener('enterframe', arguments.callee);
			}
		});
		var bear = new Bear(0, 0);

		bear.addEventListener('enterframe', function (e) {
			if (this.alive) {
				this.setMoveDirection();
				this.move();
				this.jump();
			} else {
				this.dead();
			}

			if (this.y > 320) {
				this.alive = false;
			}
		});

		/********************
		*  Monster Class
		********************/
		var Monster = Class.create(Character, {
			initialize: function (x, y) {
				Character.call(this, x, y);
				this.frame = 5;
			},
			setMoveDirection: function () {
				if (true) {
					this.vx = -1.0;
					this.scaleX = -1;
				} else if (game.input.right) {
					this.ax = 0.5;
					this.scaleX = 1;
				} else {
					this.ax = 0;
				}

				//if (this.vx != 0) {
				//	if ((game.frame - 5) % 3 == 0) {
				//		this.frame %= 2;
				//		++this.frame;
				//	}
				//} else {
				//	this.frame = 0;
				//}
			},
			//calcFriction: function () {
			//	if (this.vx >= 0) {
			//		this.friction = this.vx > 0.3 ? -0.3 : -this.vx;
			//	} else {
			//		this.friction = this.vx < -0.3 ? 0.3 : -this.vx;
			//	}
			//},
			move: function () {
				this.vy += 1;
				var dest = new Rectangle(
					this.x + this.vx + 5, this.y + this.vy + 2,
					this.width - 16, this.height - 2
				);
				while (true) {
					var boundary, crossing;
					var dx = dest.x - this.x - 5;
					var dy = dest.y - this.y - 2;
					this.vx = Math.min(Math.max(this.vx, -10), 10);
					this.vy = Math.min(Math.max(this.vy, -10), 10);
					// enum Direction もどき
					var Direction = function () {
					}
					Direction.upward = 0;
					Direction.right = 1;
					Direction.downward = 2;
					Direction.left = 3;
					//right collision
					if (dx > 0 && Math.floor(dest.right / 16) != Math.floor((dest.right - dx) / 16)) {
						boundary = Math.floor(dest.right / 16) * 16;
						crossing = (dest.right - boundary) / dx * dy + dest.y;
						if (collision(Direction.right)) {
							this.vx = 0;
							dest.x = boundary - dest.width - 0.01;
							continue;
						}
						//left collision
					} else if (dx < 0 && Math.floor(dest.x / 16) != Math.floor((dest.x - dx) / 16)) {
						boundary = Math.floor(dest.x / 16) * 16 + 16;
						crossing = (boundary - dest.x) / dx * dy + dest.y;
						if (collision(Direction.left)) {
							this.vx = 0;
							dest.x = boundary + 0.01;
							continue;
						}
					}
					//downward collision
					if (dy > 0 && Math.floor(dest.bottom / 16) != Math.floor((dest.bottom - dy) / 16)) {
						boundary = Math.floor(dest.bottom / 16) * 16;
						crossing = (dest.bottom - boundary) / dy * dx + dest.x;
						if (collision(Direction.downward)) {
							this.vy = 0;
							dest.y = boundary - dest.height - 0.01;

							if (map.checkTile(crossing, boundary) == 17 || map.checkTile(crossing + dest.width, boundary) == 17) {
								this.alive = false;
							}
							continue;
						}
						//upward collision
					} else if (dy < 0 && Math.floor(dest.y / 16) != Math.floor((dest.y - dy) / 16)) {
						boundary = Math.floor(dest.y / 16) * 16 + 16;
						crossing = (boundary - dest.y) / dy * dx + dest.x;
						if (collision(Direction.upward)) {
							this.vy = 0;
							dest.y = boundary + 0.01;
							continue;
						}
					}

					break;
				}
				this.x = dest.x - 5;
				this.y = dest.y - 2;

				function collision(direction) {
					switch (direction) {
						case Direction.right:
							if ((map.hitTest(boundary, crossing) && !map.hitTest(boundary - 16, crossing)) ||
								(map.hitTest(boundary, crossing + dest.height) && !map.hitTest(boundary - 16, crossing + dest.height))) {
								return true;
							}
							return false;
						case Direction.left:
							if ((map.hitTest(boundary - 16, crossing) && !map.hitTest(boundary, crossing)) ||
								(map.hitTest(boundary - 16, crossing + dest.height) && !map.hitTest(boundary, crossing + dest.height))) {
								return true;
							}
							return false;
						case Direction.downward:
							if ((map.hitTest(crossing, boundary) && !map.hitTest(crossing, boundary - 16)) ||
								(map.hitTest(crossing + dest.width, boundary) && !map.hitTest(crossing + dest.width, boundary - 16))) {
								return true;
							}
							return false;
						case Direction.upward:
							if ((map.hitTest(crossing, boundary - 16) && !map.hitTest(crossing, boundary)) ||
								(map.hitTest(crossing + dest.width, boundary - 16) && !map.hitTest(crossing + dest.width, boundary))) {
								return true;
							}
							return false;
						default:
							return false;
					}
				}
			},
			dead: function () {
				game.assets[Path.Audio.gameover].play();
				var score = Math.round(this.x);
				this.frame = 8;
				if (++this.count > 5) {
					this.parentNode.removeChild(this);
				}
			}
		});
		Monster.FRAME = 22;
		var monsters = new Array();
		for (var y in mapData) {
			var x = mapData[y].indexOf(Monster.FRAME);
			while (x != -1) {
				monsters.push(new Monster(x, y));
				mapData[y][x] = -1;
				x = mapData[y].indexOf(Monster.FRAME, x + 1);
			}
			map.loadData(mapData);
		}

		for (var i = 0; i < monsters.length ; i++) {
			monsters[i].addEventListener('enterframe', function (e) {
				if (this.alive) {
					this.setMoveDirection();
					this.move();
				} else {
					this.dead();
				}

				if (this.intersect(bear)) {
					//	bear.alive = false;
				}

				if (this.y > 320) {
					this.alive = false;
				}
			});
		}



		/********************
		*  Item Instance
		********************/
		var items = new Array();
		for (var y in mapData) {
			var x = mapData[y].indexOf(Item.FRAME);
			while (x != -1) {
				items.push(new Item(x, y));
				mapData[y][x] = -1;
				x = mapData[y].indexOf(Item.FRAME, x + 1);
			}
			map.loadData(mapData);
		}

		for (var i = 0; i < items.length ; i++) {
			items[i].addEventListener('enterframe', function (e) {
				if (this.intersect(bear) && bear.alive) {
					game.assets[Path.Audio.get].clone().play();
					gameScore += this.score;
					this.parentNode.removeChild(this);
				}
			});
		}

		/********************
		*  Goal Instance
		********************/
		var goals = new Array();
		for (var y in mapData) {
			var x = mapData[y].indexOf(Goal.FRAME);
			while (x != -1) {
				goals.push(new Goal(x, y));
				mapData[y][x] = -1;
				x = mapData[y].indexOf(Goal.FRAME, x + 1);
			}
			map.loadData(mapData);
		}

		for (var i = 0; i < goals.length ; i++) {
			goals[i].addEventListener('enterframe', function (e) {
				if (this.intersect(bear) && bear.alive) {
					gameScore += this.score;
					var clear = new Sprite(267, 48);
					clear.image = game.assets[Path.Sprite.clear];
					clear.x = game.width / 2 - 133;
					clear.y = game.height / 2 - 24;
					game.rootScene.addChild(clear);
					game.assets[Path.Audio.clear].play();
					game.rootScene.removeChild(stage);
				}
			});
		}

		/********************
		*  Score Instance
		********************/
		var score = new Label();
		score.x = 2;
		score.y = 5;
		score.text = 'Score:' + gameScore;
		score.addEventListener('enterframe', function (e) {
			score.text = 'Score:' + gameScore;
		});

		/********************
		*  Stage Instance
		********************/
		var stage = new Group();
		stage.addChild(map);
		stage.addChild(bear);
		for (var i = 0; i < monsters.length; i++) {
			stage.addChild(monsters[i]);
		}
		for (var i = 0; i < items.length; i++) {
			stage.addChild(items[i]);
		}
		for (var i = 0; i < goals.length; i++) {
			stage.addChild(goals[i]);
		}
		stage.addEventListener('enterframe', function (e) {
			if (this.x > 64 - bear.x) {
				this.x = 64 - bear.x;
			}
		});

		/********************
		*  Pad Instance
		********************/
		var pad = new Pad();
		pad.x = 0;
		pad.y = 224;

		//add child to root scene
		game.rootScene.addChild(stage);
		game.rootScene.addChild(score);
		game.rootScene.addChild(pad);
		game.rootScene.backgroundColor = 'rgb(182, 255, 255)';
	};
	game.start();

	/********************
	*  Item Class
	********************/
	var Item = enchant.Class.create(enchant.Sprite, {
		initialize: function (x, y) {
			enchant.Sprite.call(this, 16, 16);

			this.image = game.assets[Path.Sprite.map1];
			this.x = x * 16;
			this.y = y * 16;
			this.frame = Item.FRAME;
			this.score = 10;
			this.isExist = true;
		}
	});
	Item.FRAME = 20;

	/********************
	*  Goal Class
	********************/
	var Goal = enchant.Class.create(enchant.Sprite, {
		initialize: function (x, y) {
			enchant.Sprite.call(this, 16, 16);

			this.image = game.assets[Path.Sprite.map1];
			this.x = x * 16;
			this.y = y * 16;
			this.frame = Goal.FRAME;
			this.scaleX = -1;
			this.score = 100;
		}
	});
	Goal.FRAME = 21;
};


