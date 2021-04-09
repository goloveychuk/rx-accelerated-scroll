import React, {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import logo from './logo.svg';
import './App.css';
import { makeScrollStream } from './scroll';

interface Layout extends Position {
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}
interface Model {
  page: { height: number; width: number };
  components: Comp[];
}
interface Comp extends Position {
  id: number;

  height: number;
  width: number;
}

function Comp({
  comp,
  onNewPos,
}: {
  comp: Comp;
  onNewPos: (pos: Position, abs: Layout) => void;
}) {
  const [isCaptured, setCaptured] = useState(false);
  const onMouseDown = () => {
    setCaptured(true);
  };
  const onMouseUp = () => {
    setCaptured(false);
  };

  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (ev) => {
    if (isCaptured) {
      const rect = (ev.target as HTMLDivElement).getBoundingClientRect();
      const absLayout: Layout = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
      onNewPos(
        { x: comp.x + ev.movementX, y: comp.y + ev.movementY },
        absLayout,
      );
    }
  };
  return (
    <div
      style={{
        left: comp.x,
        top: comp.y,
        height: comp.height,
        width: comp.width,
      }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      className="comp"
    ></div>
  );
}

type Action = { type: 'setNewPos'; data: { id: number; pos: Position } };

const initialModel: Model = {
  page: {
    height: 4000,
    width: 900,
  },
  components: [{ id: 1, x: 600, y: 300, width: 150, height: 80 }],
};

const modelReducer = (model: Model, action: Action): Model => {
  if (action.type === 'setNewPos') {
    return {
      ...model,
      components: model.components.map((comp) => {
        if (comp.id === action.data.id) {
          return { ...comp, ...action.data.pos };
        }
        return comp;
      }),
    };
  }
  return model;
};

const scrollAreaHeight = 100;
const ScrollArea = React.forwardRef(({}, ref) => {
  return (
    <div
      ref={ref as any}
      style={{ height: scrollAreaHeight }}
      className="scrollarea"
    ></div>
  );
});

const ScrollHandler = React.memo(() => {
  // const {setNewPosition, scrollSpeed$} = React.useMemo(() => makeScrollStream(), []);

  return null;
});

const scrollTo = function (element: HTMLElement, to: number, speed: number) {
  element = document.scrollingElement as any;

  let start = element.scrollTop;
  let startTime = new Date().getTime()
  let lastAnimatedScroll: null | number = null;
  let diff = 0;

  const animateScroll = function () {
    lastAnimatedScroll = null;
    const now = new Date().getTime()
    const offset = speed * (now - startTime) - diff;
    console.log(speed, ((now - startTime)));
    diff += offset;
    const newScrolltop = diff + start;
    element.scrollTop = newScrolltop
    // console.log(toelement.scrollTop, element.scrollHeight)
    if (to < newScrolltop) {
      return
    }
    // if (currentTime < duration) {
      // if (element.scrollTop === lastScrollTop)
    lastAnimatedScroll = requestAnimationFrame(animateScroll);
    // } else {
    //   element.scrollTop = to;
    // }
  };

  animateScroll();

  return () => {
    if (lastAnimatedScroll) {
      cancelAnimationFrame(lastAnimatedScroll);
    }
  };
};

function App() {
  const [model, action] = useReducer(modelReducer, initialModel);

  const {
    setDraggableAbsLayout,
    scrollSpeed$,
    setScrollAreaAbsLayout,
  } = React.useMemo(
    () => makeScrollStream({ initialDelay: 1500, maxSpeed: 0.5 }), //0.5 px in ms
    [],
  );

  const scrollAreaRef = useRef<HTMLDivElement>();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let clean: null | (() => void) = null;
    scrollSpeed$.subscribe((scrollSpeed) => {
      if (clean) {
        clean();
      }
      if (scrollSpeed !== 0) {
        clean = scrollTo(pageRef.current!, 2300, scrollSpeed);
      }
    });
    const rect = scrollAreaRef.current!.getBoundingClientRect();
    setScrollAreaAbsLayout({
      x: rect.left,
      y: rect.top,
      height: rect.height,
      width: rect.width,
    });
  }, []);
  return (
    <div className="App">
      
      <ScrollArea ref={scrollAreaRef} />
      <ScrollHandler />
      <div
        ref={pageRef}
        style={{ height: model.page.height, width: model.page.width }}
        className="page"
      >
      {model.components.map((comp) => {
          const onNewPos = (pos: Position, abs: Layout) => {
            action({ type: 'setNewPos', data: { id: comp.id, pos } });
            setDraggableAbsLayout(abs);
          };
          return <Comp key={comp.id} comp={comp} onNewPos={onNewPos} />;
        })}  
      </div>
    </div>
  );
}

export default App;
