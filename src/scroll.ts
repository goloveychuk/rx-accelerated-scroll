import { BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, switchMap } from 'rxjs/operators';

interface Position {
  x: number;
  y: number;
}

interface Layout extends Position {
  width: number;
  height: number;
}

interface ScrollOpts {
  initialDelay: number;
  maxSpeed: number
  // scrollAreaAbsLayout: Layout
}

export const makeScrollStream = ({ initialDelay, maxSpeed }: ScrollOpts) => {
  const draggable$ = new Subject<Layout>();

  const scrollArea$ = new Subject<Layout>();

  const overlap$ = combineLatest([draggable$, scrollArea$])
    .pipe(
      map(([draggable, scrollLayout]) => {
        const draggableBottom = draggable.y + draggable.height;
        let overlap = draggableBottom - scrollLayout.y;
        if (overlap <= 0) {
          return 0;
        }
        overlap = overlap / scrollLayout.height;
        if (overlap >= 1) {
          overlap = 1;
        }
        overlap = Math.ceil(overlap * 10) / 10;
        return overlap;
      }),
    )
    .pipe(distinctUntilChanged());


    overlap$.subscribe(val => {
        console.log('overlap', val)
    })


  const overlapping$ = overlap$
    .pipe(map((overlap) => overlap !== 0))
    .pipe(distinctUntilChanged());

  const scrollSpeed2$ = overlapping$.pipe(
    switchMap((overlapping) => {

    //   if (!overlapping) {
    //     return new BehaviorSubject(0);
    //   }
    console.log('here')

      return overlap$.pipe(map((overlap) => {
        console.log({overlap})
        return maxSpeed * overlap
      }));
    }),
  );

  const scrollSpeed$ = overlap$.pipe(map((overlap) => {
    console.log({overlap})
    return maxSpeed * overlap
  }))

//   scrollSpeed$.subscribe((val) => {
//     console.log('val', val);
//   });

  return {
    setDraggableAbsLayout: (layout: Layout) => draggable$.next(layout),
    setScrollAreaAbsLayout: (layout: Layout) => scrollArea$.next(layout),
    scrollSpeed$,
  };
};
