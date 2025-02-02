const $ = (element) => document.querySelector(element);
const $$ = (element) => [...document.querySelectorAll(element)];
const createElement = (element, attrs = {}) => Object.assign(document.createElement(element), attrs);
const $fetch = (path) => fetch(path).then((response) => response.json());
const getStorage = (key, initState = {}) => JSON.parse(localStorage.getItem(key)) ?? initState;
const setStorage = (key, state) => localStorage.setItem(key, JSON.stringify(state));

async function init() {
  const response = await $fetch("./music_data.json");
  const musicDatas = response.data.map((item, index) => ({ id: index, ...item, price: +item.price.replace("원", "") }));
  const categorys = new Set(["ALL", ...musicDatas.map((item) => item.category)]);

  const $mainMenu = $("#main-menu");
  const $albumTitle = $("#page-inner h2");
  const $albumContents = $(".contents");
  const $pannelButton = $('.panel-body .btn[data-target="#myModal"]');
  const $pannelTotalPrice = $("#myModal .modal-body .totalprice");
  const $paymentBody = $("#myModal .modal-body tbody");
  const $paymentClose = $("#myModal .modal-footer .btn-default");
  const $paymentBtn = $("#myModal .modal-footer .btn-primary");
  const $searchInput = $(".search input");
  const $searchBtn = $(".search button");

  let search = "";
  let state = getStorage("skills-music", {
    selectedCategory: "ALL",
    carts: {},
  });
  const services = {
    get albums() {
      const albums = (state.selectedCategory === "ALL" ? musicDatas : musicDatas.filter((item) => item.category === state.selectedCategory))
        .filter((item) => (search === "" ? true : item.artist.includes(search) || item.albumName.includes(search)))
        .toSorted((a, b) => new Date(b.release) - new Date(a.release));

      return albums;
    },
    get cartAlbums() {
      return Object.keys(state.carts).map((id) => services.findAlbumById(id));
    },
    existCartById(id) {
      return id in state.carts;
    },
    getCartById(id) {
      return state.carts[id] ?? 0;
    },
    addCartById(id) {
      setState({ carts: { ...state.carts, [id]: services.getCartById(id) + 1 } });
    },
    setCartByid(id, count) {
      setState({ carts: { ...state.carts, [id]: count } });
    },
    deleteCartById(id) {
      delete state.carts[id];
      setState({ carts: { ...state.carts } });
    },
    cartReset() {
      setState({ carts: {} });
    },
    findAlbumById(id) {
      return musicDatas.find((item) => item.id == id);
    },
    get totalAlbumCount() {
      return Object.values(state.carts).reduce((acc, n) => acc + +n, 0);
    },
    get totalAlbumPrice() {
      return Object.entries(state.carts).reduce((acc, [id, count]) => acc + services.findAlbumById(id).price * count, 0);
    },
  };

  const setState = (newState) => {
    state = { ...state, ...newState };
    setStorage("skills-music", state);
    rendering();
  };

  function setEvent() {
    $paymentBtn.addEventListener("click", function () {
      alert("결제가 완료되었습니다.");
      services.cartReset();
      $paymentClose.click();
    });

    $searchInput.addEventListener("input", function () {
      search = this.value;
    });

    $searchInput.addEventListener("keydown", function ({ keyCode }) {
      const isEnter = keyCode === 13;
      if (isEnter) rendering();
    });

    $searchBtn.addEventListener("click", rendering);
  }

  function rendering() {
    $albumContents.innerHTML = services.albums.length ? "" : "검색된 앨범이 없습니다.";
    $paymentBody.innerHTML = "";
    $$("#main-menu > li:not(:first-child)").forEach((element) => element.remove());
    $albumTitle.textContent = state.selectedCategory;
    categorys.forEach(navigationItemRendering);

    services.albums.forEach(albumItemRendering);

    $pannelButton.innerHTML = `
        <i class="fa fa-shopping-cart"></i> 쇼핑카트 <strong>${services.totalAlbumCount.toLocaleString()}</strong> 개 금액 ￦ ${services.totalAlbumPrice.toLocaleString()}원</a> 
    `;

    $pannelTotalPrice.innerHTML = `
        <h3>총 합계금액 : <span>￦${services.totalAlbumPrice.toLocaleString()}</span> 원</h3>
    `;
    services.cartAlbums.forEach(payloadItemRendering);
  }

  function navigationItemRendering(categoryName) {
    const icon = categoryName === "ALL" ? "fa-th-list" : "fa-youtube-play";
    const isActive = state.selectedCategory === categoryName;
    const $li = createElement("li", {
      innerHTML: `
            <a class="${isActive ? "active-menu" : ""}" href="#"><i class="fa ${icon} fa-2x"></i> <span>${categoryName}</span></a>
        `,
    });

    $li.addEventListener("click", function () {
      setState({ selectedCategory: categoryName });
    });
    $mainMenu.append($li);
  }

  function albumItemRendering(albumItem) {
    const $element = createElement("div", {
      className: "col-md-2 col-sm-2 col-xs-2 product-grid",
      innerHTML: `
            <div class="product-items">
                    <div class="project-eff">
                        <img class="img-responsive" src="images/${albumItem.albumJaketImage}" alt="${albumItem.albumName}">
                    </div>
                <div class="produ-cost">
                    <h5>${highlightTextHTML(albumItem.albumName, search, "bg-color-red")}</h5>
                    <span>
                        <i class="fa fa-microphone"> 아티스트</i> 
                        <p>${highlightTextHTML(albumItem.artist, search, "bg-color-red")}</p>
                    </span>
                    <span>
                        <i class="fa  fa-calendar"> 발매일</i> 
                        <p>${albumItem.release}</p>
                    </span>
                    <span>
                        <i class="fa fa-money"> 가격</i>
                        <p>￦${albumItem.price.toLocaleString()}</p>
                    </span>
                    <span class="shopbtn">
                        <button class="btn btn-default btn-xs">
                        ${
                          services.existCartById(albumItem.id)
                            ? `<i class="fa fa-shopping-cart"></i> 추가하기 (${services.getCartById(albumItem.id).toLocaleString()}개)`
                            : '<i class="fa fa-shopping-cart"></i> 쇼핑카트담기'
                        }
                        </button>
                    </span>
                </div>
            </div>
        `,
    });
    const $addCart = $element.querySelector(".shopbtn button");
    $addCart.addEventListener("click", () => services.addCartById(albumItem.id));
    $albumContents.append($element);
  }

  function payloadItemRendering(albumItem) {
    const cartCount = services.getCartById(albumItem.id);
    const priceSum = albumItem.price * cartCount;
    const $element = createElement("tr", {
      innerHTML: `
            <td class="albuminfo">
                <img src="images/${albumItem.albumJaketImage}">
                <div class="info">
                    <h4>${albumItem.albumName}</h4>
                    <span>
                        <i class="fa fa-microphone"> 아티스트</i> 
                        <p>${albumItem.artist}</p>
                    </span>
                    <span>
                        <i class="fa  fa-calendar"> 발매일</i> 
                        <p>${albumItem.release}</p>
                    </span>
                </div>
            </td>
            <td class="albumprice">
                ￦ ${albumItem.price.toLocaleString()}
            </td>
            <td class="albumqty">
                <input type="number" class="form-control" value="${cartCount}">
            </td>
            <td class="pricesum">
                ￦ ${priceSum.toLocaleString()}
            </td>
            <td>
                <button class="btn btn-default">
                    <i class="fa fa-trash-o"></i> 삭제
                </button>
            </td>
        `,
    });
    const $albumqtyInput = $element.querySelector(".albumqty input");
    const $deleteBtn = $element.querySelector(".btn");

    $albumqtyInput.addEventListener("input", () => {
      $albumqtyInput.value = $albumqtyInput.value < 1 ? 1 : $albumqtyInput.value;
      services.setCartByid(albumItem.id, $albumqtyInput.value);
    });
    $deleteBtn.addEventListener("click", () => {
      const isDeleted = confirm("정말 삭제 하시겠습니까?");
      if (isDeleted) services.deleteCartById(albumItem.id);
    });
    $paymentBody.append($element);
  }

  function highlightTextHTML(basicText, highlightText) {
    const checks = Array(basicText.length).fill(false);
    const hlen = highlightText.length;
    const max = basicText.length - hlen;

    for (let i = 0; i <= max; i++) {
      if (basicText.substr(i, hlen) !== highlightText) continue;
      for (let j = i; j < i + hlen; j++) {
        checks[j] = true;
        console.log(i + length, j);
      }
    }

    return basicText
      .split("")
      .map((unitText, index) => {
        return checks[index] ? `<mark>${unitText}</mark>` : unitText;
      })
      .join("");
  }

  setEvent();
  rendering();
}

init();
