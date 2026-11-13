"""Run with the separately installed native body environment."""
import unittest
from pydantic import ValidationError
from backend.server import FlyPhysics, NeuralPacket

class BodyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.fly=FlyPhysics()
    @classmethod
    def tearDownClass(cls):cls.fly.physics.free()

    def test_actual_model_and_zero_control(self):
        schema=self.fly.schema()
        self.assertEqual(schema['nbody'],69)
        self.assertEqual(schema['nu'],65)
        state=self.fly.advance(NeuralPacket(neuralMs=10))
        self.assertTrue(all(v==0 for v in state['control'].values()))
        self.assertEqual(len(state['position']),3)
        self.assertTrue(state['time']>0)

    def test_only_named_rates_actuate_body(self):
        state=self.fly.advance(NeuralPacket(neuralMs=10,flightLeft=100,flightRight=50,landing=60))
        self.assertGreater(state['control']['wing_yaw_left'],state['control']['wing_yaw_right'])
        self.assertGreater(state['control']['coxa_T1_left'],0)

    def test_untrusted_values_rejected(self):
        for data in [dict(neuralMs=1000),dict(neuralMs=10,flightLeft=-1),dict(neuralMs=10,landing=float('nan')),dict(neuralMs=10,bait=True)]:
            with self.assertRaises(ValidationError):NeuralPacket(**data)

if __name__=='__main__':unittest.main()
