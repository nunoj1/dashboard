import { t } from './init';
import { todoRouter } from './routers/todo';
import { categoryRouter } from './routers/todo/category';
import { subtaskRouter } from './routers/todo/subtask';
import { locationRouter } from './routers/todo/location';
import { stockRouter } from './routers/stock';
import { healthRouter } from './routers/health';

export const router = t.router({
	todo: todoRouter,
	category: categoryRouter,
	subtask: subtaskRouter,
	location: locationRouter,
	stock: stockRouter,
	health: healthRouter
});

export type Router = typeof router;