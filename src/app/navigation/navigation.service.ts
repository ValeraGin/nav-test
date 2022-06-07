import { Inject, Injectable, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavItemDirective } from './nav-item.directive';

export type NavigationId = NavItemDirective;

export enum DirectionEnum {
  UP = 'up',
  RIGHT = 'right',
  DOWN = 'down',
  LEFT = 'left',
}

export const TabFriendDirection = {
  [DirectionEnum.UP]: DirectionEnum.LEFT,
  [DirectionEnum.RIGHT]: DirectionEnum.DOWN,
  [DirectionEnum.DOWN]: DirectionEnum.RIGHT,
  [DirectionEnum.LEFT]: DirectionEnum.UP,
}

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  private readonly keyDownListener: (event: KeyboardEvent) => void;
  private readonly keyUpListener: (event: KeyboardEvent) => void;

  rootItem: NavItemDirective;

  currentNavItem: NavItemDirective;

  constructor(
    private zone: NgZone,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.keyDownListener = this.keyListener.bind(this, true);
    this.keyUpListener = this.keyListener.bind(this, false);
    this.addEventListeners()
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
  }

  registerRoot(rootItem: NavItemDirective) {
    if (this.rootItem) {
      console.error('Рутовый элемент должен быть один. Вы можете два элемента этих или более добавить в один div, чтобы верхний элемент был один.')
      return
    }
    this.rootItem = rootItem;
    console.log(`Root item = ${rootItem.id}`)
    const s = this.rootItem.doCheckEmitter.subscribe(() => {
      const rootFindFocus = this.rootItem.findFocus(null, false);
     // if (rootFindFocus) {
        this.changeFocusToAnotherNavItem(rootFindFocus, null, false);
     // }
      s.unsubscribe();
    })
  }

  addEventListeners(): void {
    this.zone.runOutsideAngular(() => {
      this.document.addEventListener('keydown', this.keyDownListener, true);
      this.document.addEventListener('keyup', this.keyUpListener, true);
    });
  }

  private removeEventListeners(): void {
    this.document.removeEventListener('keydown', this.keyDownListener, true);
    this.document.removeEventListener('keyup', this.keyUpListener, true);
  }

  changeFocusToAnotherNavItem(navId: NavigationId, direction: DirectionEnum, native: boolean) {
    console.log(`Устанавливаем фокус на элемент ${navId.id}`)
    if (navId.willUnFocus) {
      const allowFromExternalFunction = this.currentNavItem.willUnFocus(navId.el.nativeElement, direction, native);
      if (!allowFromExternalFunction) {
        return
      }
    }

    // Если был кто-то в фокусе, то снимаем фокус
    if (this.currentNavItem) {
      // Старому элементу убираем фокус
      this.currentNavItem.setFocused(false);
    }

    this.currentNavItem = navId
    // Новому элементу устанавливаем фокус
    this.currentNavItem.setFocused(true);
  }

  focusedDeleted(deletedFocused: NavigationId, indexChild: number) {

    function findFocusInParent(parent: NavigationId) {
      const focus = parent.findFocus(null, false);
      if (focus) {
        return focus
      } else {
        return findFocusInParent(parent.parent);
      }
    }

    if (deletedFocused.parent.children.length > indexChild && deletedFocused.parent.children[indexChild]?.focusable) {
      this.changeFocusToAnotherNavItem(deletedFocused.parent.children[indexChild], null, false)
    } else {
      const focus = findFocusInParent(deletedFocused);
      if (focus) {
        this.changeFocusToAnotherNavItem(focus, null, false)
      } else {
        console.error('На странице нет ни одного доступного места для фокуса. Пусто.');
        // TODO: Автопоиск элементов можно тут включить до нахождения хотя бы одного
      }
    }
  }


  changeFocus(direction: DirectionEnum, isTabAction?: boolean) {
    function getNavItemInDirection(navItem: NavItemDirective, fromChild?: boolean): NavigationId {

      // Пытаемся получить того на кого перевести фокус в рамках направления
      function getFromDirection(navItem: NavItemDirective) {
        if (navItem[direction]) {
          const findFocus = navItem[direction].findFocus(direction, false, isTabAction);
          if (findFocus) {
            return findFocus;
          } else {
            console.log(`Элемент ${navItem.id} хотел установить фокус на ${navItem[direction].id}, но тот отказался`);
            console.log(`Элемент ${navItem.id} попросил ${navItem[direction].id} спросить у следующего в этом направлении`);
            return getFromDirection(navItem[direction])
          }
        }
        return
      }

      const navItemFromDirection = getFromDirection(navItem);
      if (navItemFromDirection) {
        return navItemFromDirection
      }

      if (navItem[direction]) {
        const findFocus = navItem[direction].findFocus(direction, false, isTabAction);
        if (findFocus) {
          return findFocus;
        } else {
          console.log(`Элемент ${navItem.id} хотел установить фокус на ${navItem[direction].id}, но тот отказался`);
        }
      }
      // Спрашиваем у элемента, есть ли у него родитель и будем уже у родителя спрашивать,
      // так как сам элемент не имеет такой обработки
      if (navItem.parent) {
        // Сохраним себя как ребенка на котором был фокус перед выходом, чтобы при возврате он на нас попал опять
        navItem.parent.memory = navItem;
        return getNavItemInDirection(navItem.parent)
      }
      return null
    }

    const navIdForNavigate = getNavItemInDirection(this.currentNavItem);
    if (navIdForNavigate) {
      this.changeFocusToAnotherNavItem(navIdForNavigate, direction, false);
    } else {
      if (isTabAction) {
        console.log(`Мы не смогли найти следующий элемент в направлении ${direction}. Пробуем направление ${TabFriendDirection[direction]}, так как навигация была через таб.`)
        return this.changeFocus(TabFriendDirection[direction], isTabAction)
      }
      console.log(`Не определенно действие, для нажатия ${direction}`)
    }
  }

  private keyListener(isDown: boolean, event: KeyboardEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (!isDown) return
    switch (event.key) {
      case "ArrowUp":
        this.changeFocus(DirectionEnum.UP)
        break;
      case "ArrowRight":
        this.changeFocus(DirectionEnum.RIGHT)
        break;
      case "ArrowDown":
        this.changeFocus(DirectionEnum.DOWN)
        break;
      case "ArrowLeft":
        this.changeFocus(DirectionEnum.LEFT)
        break;
      case "Tab":
        const isHorizontalRow = this.currentNavItem?.parent?.isHorizontal;
        if (event.shiftKey) {
          this.changeFocus(isHorizontalRow ? DirectionEnum.LEFT : DirectionEnum.UP, true)
        } else {
          this.changeFocus(isHorizontalRow ? DirectionEnum.RIGHT : DirectionEnum.DOWN, true)
        }
        break;
      case "Enter":
        const nativeElement = this.currentNavItem?.el?.nativeElement;
        if (nativeElement) {
          nativeElement.click();
        } else {
          console.error('Нет активного элемента для клика')
        }
        break;
    }
  }
}
